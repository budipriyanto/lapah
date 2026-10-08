import { NextRequest, NextResponse } from 'next/server';
import { generateToken, createAuthCookie } from '@/utils/auth/jwt';
import pool, { dbQueryOne } from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token verifikasi tidak ditemukan' },
        { status: 400 }
      );
    }

    const user = await dbQueryOne<{
      id: string;
      email: string;
      is_verified: boolean;
      token_version: number;
    }>(
      'SELECT id, email, is_verified, token_version FROM users WHERE verification_token = ?',
      [token]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Link verifikasi tidak valid atau sudah terpakai.' },
        { status: 400 }
      );
    }

    if (!user.is_verified) {
      await pool.execute(
        'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?',
        [user.id]
      );
    }

    const jwtToken = generateToken(user.id, user.email, 'user', user.token_version);

    const response = NextResponse.json({
      success: true,
      message: 'Email berhasil diverifikasi.',
    });
    response.headers.set('Set-Cookie', createAuthCookie(jwtToken));

    return response;
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
