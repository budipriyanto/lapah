import { NextRequest, NextResponse } from 'next/server';
import pool, { dbQueryOne } from '@/utils/db';
import { v4 as uuidv4 } from 'uuid';
import { sendResetPasswordEmail } from '@/utils/mail';
import { checkRateLimit, getClientIp } from '@/utils/auth/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const ipRl = checkRateLimit(`forgot:ip:${getClientIp(req)}`, 5, 60_000);
    const emailRl = checkRateLimit(
      `forgot:email:${String(email).toLowerCase()}`,
      3,
      15 * 60_000
    );
    const blocked = !ipRl.ok ? ipRl : !emailRl.ok ? emailRl : null;
    if (blocked) {
      return NextResponse.json(
        { success: false, error: 'Permintaan terlalu banyak. Coba lagi nanti.' },
        { status: 429, headers: { 'Retry-After': String(blocked.retryAfterSec) } }
      );
    }

    // Cari user berdasarkan email
    const user = await dbQueryOne<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // Jangan reveal apakah email ada (security best practice)
      return NextResponse.json({
        success: true,
        message: "Jika email terdaftar di Lapah, link reset password sudah dikirim"
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Simpan token ke database beserta waktu kadaluwarsa
    await pool.execute(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, expiresAt, user.id]
    );

    // Kirim email reset password
    await sendResetPasswordEmail(
      user.email,
      resetToken,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    );

    // Response: sukses tapi tidak reveal info email
    return NextResponse.json({
      success: true,
      message: "Jika email terdaftar di Lapah, link reset password sudah dikirim ke dalam email"
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process forgot password request' },
      { status: 500 }
    );
  }
}