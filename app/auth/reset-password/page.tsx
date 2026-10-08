"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const tokenRef = useRef<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(window.location.search).get("token");
    tokenRef.current = tokenFromUrl;

    let cancelled = false;

    async function validateToken() {
      if (!tokenFromUrl) {
        if (!cancelled) {
          setTokenValid(false);
          setError("Link reset tidak valid. Silakan minta link baru.");
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(tokenFromUrl)}`
        );
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json?.success) {
          setTokenValid(false);
          setError(json?.error || "Link reset tidak valid atau sudah kedaluwarsa.");
        } else {
          setTokenValid(true);
        }
      } catch {
        if (!cancelled) {
          setTokenValid(false);
          setError("Gagal memeriksa link reset. Silakan coba lagi.");
        }
      }
    }

    validateToken();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = tokenRef.current;
    if (tokenValid !== true || !token) return;

    setError("");
    setSubmitting(true);

    const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      setError(json?.error || "Gagal mereset password");
      if (json?.error && /terpakai|kedaluwarsa|tidak valid/i.test(json.error)) {
        setTokenValid(false);
      }
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => {
      window.location.href = "/auth/login";
    }, 1500);
    return () => clearTimeout(t);
  }, [success]);

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
          Password Berhasil Diperbarui
        </h1>
        <p className="mb-6 text-sm text-[#737373]">
          Sesi Anda telah berakhir. Silakan login kembali dengan password baru Anda.
        </p>
        <Link
          href="/auth/login"
          className="inline-block rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3]"
        >
          Login Sekarang
        </Link>
        <p className="mt-4 text-sm text-[#737373]">
          <Link
            href="/auth/login"
            className="font-medium text-[#0066cc] hover:underline"
          >
            Kembali ke halaman login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[#1a1a1a]">Reset Password</h1>
      <p className="mb-6 text-sm text-[#737373]">
        Masukkan password baru untuk akun Anda.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <p>{error}</p>
          {tokenValid === false && (
            <p className="mt-2">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-[#0066cc] hover:underline"
              >
                Minta link reset baru
              </Link>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">
            Password Baru
          </label>
          <input
            type="password"
            placeholder="Password baru"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={tokenValid !== true}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] disabled:bg-zinc-100"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || tokenValid !== true}
          className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
        >
          {tokenValid === null
            ? "Memeriksa link..."
            : tokenValid === false
              ? "Link tidak valid"
              : submitting
                ? "Menyimpan..."
                : "Reset Password"}
        </button>
      </form>
    </div>
  );
}