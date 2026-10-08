import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/utils/auth/password';
import { generateToken, createAuthCookie } from '@/utils/auth/jwt';
import { dbQueryOne, dbQuery } from '@/utils/db';
import { checkRateLimit, resetRateLimit } from '@/utils/auth/rate-limit';

interface LoginUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  is_active: boolean;
  token_version: number;
  failed_login_attempts: number;
  is_locked: number;
  lock_remaining: number;
  role: 'user' | 'admin' | 'moderator' | null;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const IP_LIMIT = 10;
const IP_WINDOW_MS = 60_000;

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function tooManyMessage(retryAfterSec: number): string {
  if (retryAfterSec >= 120) {
    return `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.`;
  }
  return `Terlalu banyak percobaan login. Coba lagi dalam ${retryAfterSec} detik.`;
}

export async function POST(req: NextRequest) {
  try {
    // Lapis 2: rate limit per-IP (menghitung semua percobaan, reset saat sukses)
    const ip = getClientIp(req);
    const ipKey = `login:ip:${ip}`;
    const ipRl = checkRateLimit(ipKey, IP_LIMIT, IP_WINDOW_MS);
    if (!ipRl.ok) {
      return NextResponse.json(
        { success: false, error: tooManyMessage(ipRl.retryAfterSec) },
        { status: 429, headers: { 'Retry-After': String(ipRl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase();

    // Fetch user + role from database
    const user = await dbQueryOne<LoginUser>(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active, u.token_version,
              u.failed_login_attempts,
              (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS is_locked,
              COALESCE(GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), u.locked_until)), 0) AS lock_remaining,
              ur.role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.email = ?`,
      [normalizedEmail]
    );

    if (!user) {
      // Email tak dikenal: "kunci" sintetis in-memory agar perilaku429
      // sama dengan akun nyata (tidak membocorkan keberadaan akun)
      const ghost = checkRateLimit(`login:ghost:${normalizedEmail}`, MAX_FAILED_ATTEMPTS - 1, LOCK_MINUTES * 60_000);
      if (!ghost.ok) {
        return NextResponse.json(
          { success: false, error: tooManyMessage(ghost.retryAfterSec) },
          { status: 429, headers: { 'Retry-After': String(ghost.retryAfterSec) } }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Lapis 1: lockout per-akun
    if (user.is_locked) {
      return NextResponse.json(
        { success: false, error: tooManyMessage(user.lock_remaining) },
        {
          status: 429,
          headers: { 'Retry-After': String(user.lock_remaining) },
        }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await dbQuery(
          `UPDATE users
           SET failed_login_attempts = ?,
               locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [attempts, LOCK_MINUTES, user.id]
        );
        const retryAfterSec = LOCK_MINUTES * 60;
        return NextResponse.json(
          { success: false, error: tooManyMessage(retryAfterSec) },
          { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
        );
      }
      await dbQuery(
        'UPDATE users SET failed_login_attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [attempts, user.id]
      );
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Sukses: reset counter, kunci (jika ada), dan rate limit IP
    if (user.failed_login_attempts > 0) {
      await dbQuery(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
    }
    resetRateLimit(ipKey);

    const userRole = user.role ?? 'user';

    // Generate JWT token
    const token = generateToken(user.id, user.email, userRole, user.token_version);

    // Create response with auth cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
          },
          token,
          role: userRole,
        },
      },
      { status: 200 }
    );

    // Set auth cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
