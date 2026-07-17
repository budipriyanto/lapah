"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const err = await signUp(email, password);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
          Cek Email Kamu
        </h1>
        <p className="text-sm text-[#737373]">
          Kami sudah mengirim link konfirmasi ke <strong>{email}</strong>.
          Klik link tersebut untuk mengaktifkan akun.
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
