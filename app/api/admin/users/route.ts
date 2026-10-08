import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool, { dbQuery } from '@/utils/db';
import { requireSuperadmin } from '@/utils/auth/rbac';
import {
  hashPassword,
  validateEmail,
  validatePasswordStrength,
} from '@/utils/auth/password';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin' | 'moderator';
  is_active: number;
  is_verified: number;
  created_at: string;
}

const VALID_ROLES = ['user', 'admin', 'moderator'] as const;

// GET: Daftar semua pengguna + role (superadmin only)
export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const users = await dbQuery<AdminUser[]>(
      `SELECT u.id, u.email, u.full_name, COALESCE(ur.role, 'user') AS role,
              u.is_active, u.is_verified, u.created_at
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: Buat akun baru dengan role tertentu (superadmin only)
export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin(req);
  if (auth instanceof NextResponse) return auth;

  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    const body = await req.json();
    const { email, password, fullName, role } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password, fullName, role' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_active, is_verified)
       VALUES (?, ?, ?, ?, 1, 1)`,
      [userId, email, passwordHash, fullName]
    );
    await connection.execute(
      'INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, role, auth.userId]
    );
    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        data: {
          id: userId,
          email,
          full_name: fullName,
          role,
          is_active: 1,
          is_verified: 1,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback failure
      }
    }
    if ((error as { errno?: number })?.errno === 1062) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
