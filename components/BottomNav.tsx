"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

const DESTINASI_ICON = (active: boolean) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "#0066cc" : "#737373"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const HOME_ICON = (active: boolean) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill={active ? "#0066cc" : "none"}
    stroke={active ? "#0066cc" : "#737373"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const PENGINAPAN_ICON = (active: boolean) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "#0066cc" : "#737373"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <path d="M6 8v9" />
  </svg>
);

const KULINER_ICON = (active: boolean) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "#0066cc" : "#737373"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

const EVENT_ICON = (active: boolean) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "#0066cc" : "#737373"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

function isActive(pathname: string, tab: string) {
  if (tab === "home") return pathname === "/";
  if (tab === "wisata") return pathname === "/wisata";
  if (tab === "penginapan") return pathname === "/penginapan";
  if (tab === "kuliner") return pathname === "/kuliner";
  if (tab === "events") return pathname === "/events";
  return false;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navigate = useCallback((href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  }, [router]);

  const prefetch = useCallback((href: string) => () => {
    router.prefetch(href);
  }, [router]);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-zinc-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg flex items-start justify-around h-[68px] px-6 pt-2">
        <button
          onClick={navigate("/wisata")}
          onMouseEnter={prefetch("/wisata")}
          className="flex flex-col items-center gap-1 pt-1"
        >
          {DESTINASI_ICON(isActive(pathname, "wisata"))}
          <span
            className={`text-[10px] leading-none ${
              isActive(pathname, "wisata")
                ? "text-[#0066cc] font-medium"
                : "text-[#737373]"
            }`}
          >
            Wisata
          </span>
        </button>

        <button
          onClick={navigate("/penginapan")}
          onMouseEnter={prefetch("/penginapan")}
          className="flex flex-col items-center gap-1 pt-1"
        >
          {PENGINAPAN_ICON(isActive(pathname, "penginapan"))}
          <span
            className={`text-[10px] leading-none ${
              isActive(pathname, "penginapan")
                ? "text-[#0066cc] font-medium"
                : "text-[#737373]"
            }`}
          >
            Penginapan
          </span>
        </button>

        <div className="flex flex-col items-center -mt-4">
          <button
            onClick={navigate("/")}
            onMouseEnter={prefetch("/")}
            className="w-12 h-12 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center"
          >
            {HOME_ICON(isActive(pathname, "home"))}
          </button>
          <span
            className={`text-[10px] leading-none mt-0.5 ${
              isActive(pathname, "home")
                ? "text-[#0066cc] font-medium"
                : "text-[#737373]"
            }`}
          >
            Beranda
          </span>
        </div>

        <button
          onClick={navigate("/kuliner")}
          onMouseEnter={prefetch("/kuliner")}
          className="flex flex-col items-center gap-1 pt-1"
        >
          {KULINER_ICON(isActive(pathname, "kuliner"))}
          <span
            className={`text-[10px] leading-none ${
              isActive(pathname, "kuliner")
                ? "text-[#0066cc] font-medium"
                : "text-[#737373]"
            }`}
          >
            Kuliner
          </span>
        </button>

        <button
          onClick={navigate("/events")}
          onMouseEnter={prefetch("/events")}
          className="flex flex-col items-center gap-1 pt-1"
        >
          {EVENT_ICON(isActive(pathname, "events"))}
          <span
            className={`text-[10px] leading-none ${
              isActive(pathname, "events")
                ? "text-[#0066cc] font-medium"
                : "text-[#737373]"
            }`}
          >
            Acara
          </span>
        </button>
      </div>
    </nav>
  );
}
