"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const errMsg = await forgotPassword(email);

    if (errMsg) {
      setError(errMsg);
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">Link Terkirim</h1>
        <p className="mb-1 text-sm text-[#737373]">
          Link reset password telah dikirim ke
        </p>
        <p className="mb-3 text-sm font-medium text-[#1a1a1a] break-all">{email}</p>
        <p className="mb-6 text-sm text-[#737373]">
          Link berlaku selama 24 jam. Periksa folder spam jika tidak ditemukan.
        </p>
        <button
          onClick={() => router.push("/auth/login")}
          className="rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3]"
        >
          Login Sekarang
        </button>
        <p className="mt-4 text-sm text-[#737373]">
          Salah email?{" "}
          <button
            onClick={() => setSuccess(false)}
            className="font-medium text-[#0066cc] hover:underline"
          >
            Kirim ulang
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[#1a1a1a]">Lupa Password?</h1>
      <p className="mb-6 text-sm text-[#737373]">
        Masukkan email yang terdaftar dan kami akan mengirim link reset password ke email Anda.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
        >
          {submitting ? "Mengirim..." : "Kirim Link Reset"}
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