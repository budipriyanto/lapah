"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/destinasi", label: "Destinasi", icon: "📍" },
  { href: "/admin/events", label: "Events", icon: "📅" },
  { href: "/admin/ulasan", label: "Ulasan", icon: "💬" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "admin") return null;

  return (
    <div className="mx-auto flex max-w-6xl px-4 py-6 sm:px-6">
      <aside className="mr-6 hidden w-48 shrink-0 sm:block">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#0066cc]/10 text-[#0066cc]"
                    : "text-[#737373] hover:bg-zinc-100 hover:text-[#1a1a1a]"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        {/* Mobile nav */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:hidden">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#0066cc] text-white"
                    : "bg-zinc-100 text-[#737373]"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>

        {children}
      </main>
    </div>
  );
}
