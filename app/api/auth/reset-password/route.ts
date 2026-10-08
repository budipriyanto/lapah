import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/utils/auth/password';
import { createClearCookie } from '@/utils/auth/jwt';
import pool, { dbQueryOne } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token reset tidak valid' },
        { status: 400 }
      );
    }

    // Cari user berdasarkan token (cek expiry via DB clock untuk membedakan jenis error)
    const user = await dbQueryOne<{ id: string; email: string; is_valid: number }>(
      'SELECT id, email, (password_reset_expires > NOW()) AS is_valid FROM users WHERE password_reset_token = ?',
      [token]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Link reset sudah terpakai atau tidak valid. Silakan minta link baru.' },
        { status: 400 }
      );
    }

    if (!user.is_valid) {
      return NextResponse.json(
        { success: false, error: 'Link reset sudah kedaluwarsa (berlaku 24 jam). Silakan minta link baru.' },
        { status: 400 }
      );
    }

    // Token valid, kembalikan token ke frontend beserta email
    return NextResponse.json({
      success: true,
      token,
      email: user.email,
    });
  } catch (error) {
    console.error("Reset password (GET) error:", error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const { password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validasi token + cek kadaluwarsa (bedakan: terpakai vs expired)
    const user = await dbQueryOne<{ id: string; is_valid: number }>(
      'SELECT id, (password_reset_expires > NOW()) AS is_valid FROM users WHERE password_reset_token = ?',
      [token]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Link reset sudah terpakai atau tidak valid. Silakan minta link baru.' },
        { status: 400 }
      );
    }

    if (!user.is_valid) {
      return NextResponse.json(
        { success: false, error: 'Link reset sudah kedaluwarsa (berlaku 24 jam). Silakan minta link baru.' },
        { status: 400 }
      );
    }

    // Hash password baru
    const passwordHash = await hashPassword(password);

    // Update password, clear reset token, increment token_version
    // agar semua JWT lama (di semua perangkat) langsung hangus
    await pool.execute(
      'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, token_version = token_version + 1 WHERE id = ?',
      [passwordHash, user.id]
    );

    const response = NextResponse.json({
      success: true,
      message: "Password berhasil diperbarui. Silakan login dengan password baru.",
    });

    // Hapus cookie sesi di browser ini (paksa logout)
    response.headers.set('Set-Cookie', createClearCookie());

    return response;
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}