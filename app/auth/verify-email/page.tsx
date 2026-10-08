"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = "checking" | "success" | "error";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    let cancelled = false;

    async function verify() {
      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Link verifikasi tidak valid. Silakan daftar ulang.");
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json?.success) {
          setStatus("error");
          setMessage(
            json?.error || "Link verifikasi tidak valid atau sudah kedaluwarsa."
          );
        } else {
          setStatus("success");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Gagal memverifikasi email. Silakan coba lagi.");
        }
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      window.location.href = "/";
    }, 1500);
    return () => clearTimeout(t);
  }, [status]);

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        <p className="text-sm text-[#737373]">Memeriksa link verifikasi...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
          Verifikasi Gagal
        </h1>
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {message}
        </div>
        <p className="text-sm text-[#737373]">
          Jika akun Anda sudah aktif, silakan{" "}
          <Link
            href="/auth/login"
            className="font-medium text-[#0066cc] hover:underline"
          >
            login
          </Link>
          .
        </p>
        <p className="mt-2 text-sm text-[#737373]">
          Belum punya akun?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-[#0066cc] hover:underline"
          >
            Daftar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[#1a1a1a]">
        Akun Berhasil Diverifikasi
      </h1>
      <p className="mb-6 text-sm text-[#737373]">
        Akun Anda sudah aktif. Anda akan diarahkan ke halaman utama...
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3]"
      >
        Ke Beranda
      </Link>
    </div>
  );
}
