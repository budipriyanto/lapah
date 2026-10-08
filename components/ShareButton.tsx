"use client";

import { useState } from "react";

interface ShareButtonProps {
  title: string;
  text?: string;
  address?: string;
  url?: string;
}

export default function ShareButton({
  title,
  text,
  address,
  url,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const shareText = [title, text, address ? `📍 ${address}` : null]
    .filter(Boolean)
    .join("\n");

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text: shareText, url: shareUrl }).catch(() => {});
      return;
    }

    setShowPicker((v) => !v);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setShowPicker(false);
    setTimeout(() => setCopied(false), 2000);
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="relative">
      {showPicker && (
        <div className="absolute right-0 bottom-16 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-lg">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowPicker(false)}
            className="block px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-zinc-50"
          >
            WhatsApp
          </a>
          <a
            href={tgHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowPicker(false)}
            className="block px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-zinc-50"
          >
            Telegram
          </a>
          <button
            onClick={copyLink}
            className="block w-full px-4 py-2.5 text-left text-sm text-[#1a1a1a] hover:bg-zinc-50"
          >
            {copied ? "Tersalin ✓" : "Salin teks & link"}
          </button>
        </div>
      )}
      <button
        onClick={handleShare}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label="Bagikan"
      >
        {copied ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        )}
      </button>
    </div>
  );
}
