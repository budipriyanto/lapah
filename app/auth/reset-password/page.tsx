"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { authErrorMessage } from "@/utils/auth-error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        session &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION")
      ) {
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        setChecking(false);
        return;
      }
      router.replace(
        "/auth/lupa-password?error=" +
          encodeURIComponent(
            "Sesi reset tidak ditemukan. Silakan minta tautan baru.",
          ),
      );
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (password !== confirm) {
      setError("Password tidak cocok");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(authErrorMessage(error, "Gagal menyimpan password baru."));
    } else {
      await supabase.auth.signOut().catch(() => {});
      setSuccess(true);
      setTimeout(() => {
        router.replace("/auth/login");
        router.refresh();
      }, 2000);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className="rounded-lg bg-zinc-50 px-4 py-6 text-center">
          <p className="text-sm text-[#737373]">Memverifikasi tautan reset...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className="rounded-lg bg-green-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-green-700">
            Password berhasil diubah
          </p>
          <p className="mt-2 text-xs text-green-600">
            Mengarahkan ke halaman login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-[#1a1a1a]">Reset Password</h1>
      <p className="mb-6 text-sm text-[#737373]">Buat password baru</p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
            Password Baru
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

        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
            Konfirmasi Password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
        >
          {submitting ? "Menyimpan..." : "Ubah Password"}
        </button>
      </form>
    </div>
  );
}
