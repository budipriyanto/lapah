"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[#1a1a1a]">Lupa Password</h1>
      <p className="mb-6 text-sm text-[#737373]">
        Masukkan email untuk menerima tautan reset password
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {sent ? (
        <div className="rounded-lg bg-green-50 px-4 py-6 text-center">
          <p className="text-sm text-green-700">
            Tautan reset password telah dikirim ke <strong>{email}</strong>
          </p>
          <p className="mt-2 text-xs text-green-600">
            Cek inbox atau folder spam
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
          >
            {submitting ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-[#737373]">
        <Link href="/auth/login" className="font-medium text-[#0066cc] hover:underline">
          Kembali ke Login
        </Link>
      </p>
    </div>
  );
}
