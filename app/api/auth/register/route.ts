import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  hashPassword,
  validateEmail,
  validatePasswordStrength,
} from '@/utils/auth/password';
import { sendVerificationEmail } from '@/utils/mail';
import pool, { dbQueryOne } from '@/utils/db';

export async function POST(req: NextRequest) {
  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    const body = await req.json();
    const { email, password, fullName } = body;

    // Validate input
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password, fullName' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check email uniqueness against database
    const existingUser = await dbQueryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate user ID
    const userId = uuidv4();
    const verificationToken = uuidv4();

    // Create user + role + verification token atomically; email verifikasi
    // dikirim DI DALAM transaksi supaya jika email gagal terkirim, seluruh
    // pendaftaran ikut di-rollback (user bisa daftar ulang tanpa 409 palsu).
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute(
      'INSERT INTO users (id, email, password_hash, full_name, verification_token) VALUES (?, ?, ?, ?, ?)',
      [userId, email, passwordHash, fullName, verificationToken]
    );
    await connection.execute(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [uuidv4(), userId, 'user']
    );
    await sendVerificationEmail(
      email,
      verificationToken,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );
    await connection.commit();

    // Response: TIDAK auto-login, tampilkan pesan cek email
    return NextResponse.json(
      {
        success: true,
        message: "Link verifikasi sudah dikirim ke email Anda. Lengkapi pendaftaran dengan mengklik link di email.",
      },
      { status: 201 }
    );

    // Catatan: Cookie auth TIDAK di-set di sini karena akun belum diverifikasi.
    // User harus verify email terlebih dahulu baru bisa login.

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback failure
      }
    }
    // Duplicate email race (unique index)
    if ((error as { errno?: number })?.errno === 1062) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }
    console.error('Register error:', error);
    const code = (error as { code?: string })?.code;
    if (typeof code === 'string' && code.startsWith('E')) {
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email. Please try again.' },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}