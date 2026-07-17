"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchContext } from "@/contexts/SearchContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const showSearch =
    pathname === "/" ||
    pathname === "/wisata" ||
    pathname === "/kuliner" ||
    pathname === "/penginapan" ||
    pathname === "/events";
  const { inputValue, setInputValue } = useSearchContext();

  return (
    <header className="sticky top-0 z-50 bg-[#fafafa]/80 backdrop-blur-md border-b border-zinc-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-xl font-bold tracking-tight text-[#1a1a1a]"
        >
          lapah
        </Link>

        {showSearch && (
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Cari destinasi..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#737373]"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        )}

        <div className="shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              {role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-[#737373] transition-colors hover:bg-zinc-100"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc] text-xs font-medium text-white"
              >
                {user.email?.charAt(0).toUpperCase() || "U"}
              </Link>
              <button
                onClick={signOut}
                className="text-xs text-[#737373] hover:text-[#1a1a1a] transition-colors"
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-[#0066cc] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0052a3]"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
