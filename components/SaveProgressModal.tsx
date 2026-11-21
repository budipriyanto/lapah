"use client";

export type SaveStage = "upload" | "save" | "done" | "error";

interface SaveProgressModalProps {
  open: boolean;
  stage: SaveStage;
  progress: number;
  uploaded: number;
  total: number;
  error?: string | null;
  onClose: () => void;
}

export default function SaveProgressModal({
  open,
  stage,
  progress,
  uploaded,
  total,
  error,
  onClose,
}: SaveProgressModalProps) {
  if (!open) return null;

  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        {stage === "done" ? (
          <div className="py-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="text-green-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-semibold text-[#1a1a1a]">Berhasil disimpan!</p>
            <p className="mt-1 text-sm text-[#737373]">Halaman akan dialihkan...</p>
          </div>
        ) : stage === "error" ? (
          <div className="py-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="text-red-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <p className="font-semibold text-[#1a1a1a]">Gagal menyimpan</p>
            <p className="mt-1 break-words text-sm text-[#737373]">
              {error || "Terjadi kesalahan"}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#737373] hover:bg-zinc-50"
            >
              Tutup
            </button>
          </div>
        ) : (
          <div className="py-1">
            <p className="font-semibold text-[#1a1a1a]">
              {stage === "upload" ? "Mengunggah gambar..." : "Menyimpan data..."}
            </p>
            <p className="mt-0.5 text-sm text-[#737373]">
              {stage === "upload" ? `${uploaded} dari ${total} gambar` : "Mohon tunggu sebentar"}
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-[#0066cc] transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-[#737373]">{pct}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
