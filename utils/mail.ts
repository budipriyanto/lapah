import nodemailer from 'nodemailer';

// Alamat pengirim: wajib domain yang diakui server SMTP.
// Bisa di-override via SMTP_FROM, default: SMTP_USER
const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@lapah.id';
const FROM_HEADER = `"Lapah" <${FROM_ADDRESS}>`;

// Create transporter once and reuse
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports (587, 2525, etc.)
});

// Kirim email verifikasi
export async function sendVerificationEmail(
  email: string,
  token: string,
  appUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: FROM_HEADER,
    to: email,
    subject: 'Verifikasi Email Informasi Wisata Kabupaten Lampung Timur [No-Reply]',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a; text-align: center;">Verifikasi Email</h1>
        <p style="color: #737373; text-align: center; font-size: 16px;">
          Selamat datang di Informasi Wisata Kabupaten Lampung Timur! Silakan klik link berikut untuk mengaktifkan akun Anda:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/auth/verify-email?token=${token}" 
             style="background: #0066cc; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Aktifkan Akun
          </a>
        </div>
        <p style="color: #737373; font-size: 14px;">
          Link verifikasi berlaku selama <strong>24 jam</strong> dari waktu dibuat.
        </p>
        <p style="color: #737373; font-size: 14px;">
          Jika Anda tidak membuat akun ini, silakan abaikan email ini.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="color: #737373; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Informasi Destinasi Wisata & Kuliner Lampung Timur.
        </p>
      </div>
    `,
  });
}

// Kirim email reset password
export async function sendResetPasswordEmail(
  email: string,
  token: string,
  appUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: FROM_HEADER,
    to: email,
    subject: 'Reset Password Informasi Wisata Kabupaten Lampung Timur [No-Reply]',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a; text-align: center;">Reset Password</h1>
        <p style="color: #737373; text-align: center; font-size: 16px;">
          Anda meminta reset password untuk akun. Klik link berikut untuk mengatur password baru:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/auth/reset-password?token=${token}" 
             style="background: #0066cc; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #737373; font-size: 14px;">
          Link reset password berlaku selama <strong>24 jam</strong>.
        </p>
        <p style="color: #737373; font-size: 14px;">
          Jika Anda tidak meminta reset password, silakan abaikan email ini.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="color: #737373; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Informasi Destinasi Wisata & Kuliner Lampung Timur.
        </p>
      </div>
    `,
  });
}