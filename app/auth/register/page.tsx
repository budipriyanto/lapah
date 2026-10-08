"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const params = useSearchParams();
  const alreadyVerified = params.get('verified') === '1';
  const checkEmail = params.get('check_email') === '1';

  // Baca email dari localStorage jika ada (dari signUp flow)
  const pendingEmail = typeof window !== "undefined" ? localStorage.getItem("pendingRegisterEmail") : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const err = await signUp(email, password, fullName);
    if (err) {
      setError(err);
    }
    setSubmitting(false);
  }

  // Fungsi kirim ulang verifikasi
  async function resendVerification() {
    const emailToResend = pendingEmail || email;
    if (!emailToResend) return;
    
    setError("");
    setSubmitting(true);
    
    const err = await signUp(emailToResend, password, fullName);
    if (err) {
      setError(err);
    }
    setSubmitting(false);
  }

  if (checkEmail || alreadyVerified) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        {alreadyVerified ? (
          <div>
            <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
              Akun Berhasil Diverifikasi
            </h1>
            <p className="text-sm text-[#737373]">
              Akun Anda sudah aktif. Silakan login di bawah ini.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
              Cek Email Kamu
            </h1>
            <p className="text-sm text-[#737373]">
              Kami sudah mengirim link konfirmasi ke <strong>{pendingEmail || email}</strong>.
            </p>
            <p className="text-sm text-[#737373]">
              Klik link tersebut untuk mengaktifkan akun Anda.
            </p>
            <div className="mt-4">
              <button
                onClick={resendVerification}
                disabled={submitting}
                className="rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Kirim Ulang"}
              </button>
            </div>
            <p className="mt-4 text-center text-sm text-[#737373]">
              Masih belum menerima email? Cek folder <span className="font-medium">Spam/Promosi</span>.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Jika verified=1 dari query (user datang dari link verifikasi)
  if (alreadyVerified) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
          Akun Sudah Diverifikasi
        </h1>
        <p className="text-sm text-[#737373]">
          Akun Anda sudah aktif. Silakan login di bawah ini.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <button
            type="submit"
            className="rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white"
          >
            Login Sekarang
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#737373]">
          <Link
            href="/auth/login"
            className="font-medium text-[#0066cc] hover:underline"
          >
            Atau buat akun baru
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[#1a1a1a]">Daftar</h1>
      <p className="mb-6 text-sm text-[#737373]">
        Buat akun untuk menulis ulasan
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="mb-1 block text-sm font-medium text-[#1a1a1a]"
          >
            Nama Lengkap
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-[#1a1a1a]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-[#1a1a1a]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
        >
          {submitting ? "Memproses..." : "Daftar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[#737373]">
        Sudah punya akun?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-[#0066cc] hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}