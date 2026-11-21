"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { NC_IMAGE_CARD_WIDTH, withImageWidth } from "@/utils/image-url";

interface LocalOnlyItem {
  id: string;
  title: string;
  slug: string;
}

interface Preview {
  sourceBaseUrl: string;
  generatedAt: string;
  source: {
    destinations: number;
    events: number;
    reviews: number;
    images: number;
  };
  destinations: {
    total: number;
    new: number;
    update: number;
    delete: number;
    localOnly: LocalOnlyItem[];
  };
  events: {
    total: number;
    new: number;
    update: number;
    delete: number;
    localOnly: LocalOnlyItem[];
  };
  local: {
    destinations: number;
    events: number;
  };
  assets: {
    existing: number;
    missing: number;
  };
}

interface PhaseSummary {
  inserted: number;
  updated: number;
  deleted: number;
  imagesCopied: number;
  imagesSkipped: number;
  failed: number;
}

interface SyncItemResult {
  slug: string;
  title: string;
  action: "inserted" | "updated" | "failed";
  imagesCopied: number;
  imagesSkipped: number;
  error?: string;
}

interface RunResponse {
  runId: string;
  phase: string;
  nextOffset: number;
  done: boolean;
  summary: PhaseSummary;
  details: SyncItemResult[];
  errors: string[];
}

interface VariantResponse {
  offset: number;
  nextOffset: number;
  done: boolean;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface Asset {
  id: string;
  remote_url: string;
  nextcloud_file: string;
  filename: string | null;
  mime: string | null;
  size: number | null;
  source_type: string | null;
  source_slug: string | null;
  created_at: string;
}

type MessageKind = "info" | "success" | "error";

function emptySummary(): PhaseSummary {
  return {
    inserted: 0,
    updated: 0,
    deleted: 0,
    imagesCopied: 0,
    imagesSkipped: 0,
    failed: 0,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatBytes(size: number | null): string {
  if (!size || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || `Request gagal (${response.status})`);
  }

  return payload as T;
}

export default function AdminSetting() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [totals, setTotals] = useState<PhaseSummary>(emptySummary);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState({
    done: 0,
    total: 0,
  });
  const [warming, setWarming] = useState(false);
  const [warmProgress, setWarmProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<MessageKind>("info");

  const loadAssets = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/assets");
      const payload = (await response.json().catch(() => ({}))) as {
        assets?: Asset[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat asset");
      }
      setAssets(payload.assets ?? []);
    } catch {
      setAssets([]);
    }
  }, []);

  function appendLog(line: string) {
    setLogs((prev) => [...prev.slice(-199), line]);
  }

  function appendErrors(items: string[]) {
    if (items.length === 0) return;
    setErrors((prev) => [...prev, ...items].slice(-200));
  }

  function appendDetails(items: SyncItemResult[]) {
    for (const item of items) {
      const label =
        item.action === "inserted"
          ? "baru"
          : item.action === "updated"
            ? "update"
            : "gagal";
      appendLog(
        `${item.title} (${item.slug}): ${label}${
          item.error ? ` — ${item.error}` : ""
        }`,
      );
    }
  }

  function accumulate(summary: PhaseSummary) {
    setTotals((prev) => ({
      inserted: prev.inserted + summary.inserted,
      updated: prev.updated + summary.updated,
      deleted: prev.deleted + summary.deleted,
      imagesCopied: prev.imagesCopied + summary.imagesCopied,
      imagesSkipped: prev.imagesSkipped + summary.imagesSkipped,
      failed: prev.failed + summary.failed,
    }));
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setMessage(null);

    try {
      const data = await postJson<Preview>("/api/admin/sync/preview", {});
      setPreview(data);
      setMessage(
        `Preview dimuat: ${data.source.destinations} destinasi, ${data.source.events} event, ${data.source.images} gambar.`,
      );
      setMessageKind("info");
      void loadAssets();
    } catch (error) {
      setMessage(errorText(error));
      setMessageKind("error");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSync() {
    if (!preview || running) return;

    const deletedItems =
      preview.destinations.delete + preview.events.delete;

    if (deletedItems > 0) {
      const confirmed = window.confirm(
        `Mode mirror akan menghapus ${preview.destinations.delete} destinasi dan ${preview.events.delete} event lokal yang tidak ada di sumber. Lanjutkan?`,
      );
      if (!confirmed) return;
    }

    setRunning(true);
    setMessage(null);
    setLogs([]);
    setErrors([]);
    setTotals(emptySummary());
    setProgress({ done: 0, total: preview.source.destinations });
    setPhase("Destinasi");

    let runId: string | null = null;

    async function runBatchPhase(
      phaseName: "destinations" | "events",
      total: number,
    ) {
      let offset = 0;

      while (true) {
        const response = await postJson<RunResponse>("/api/admin/sync/run", {
          runId,
          phase: phaseName,
          offset,
          limit: 3,
          confirmMirror: true,
        });

        runId = response.runId;
        accumulate(response.summary);
        appendErrors(response.errors);
        appendDetails(response.details);

        const count = response.nextOffset - offset;
        appendLog(
          `${phaseName === "destinations" ? "Destinasi" : "Event"} ${offset + 1}–${offset + count}: ` +
            `${response.summary.inserted} baru, ${response.summary.updated} update, ` +
            `${response.summary.imagesCopied} gambar disalin, ${response.summary.failed} gagal.`,
        );

        offset = response.nextOffset;
        setProgress({ done: offset, total });

        if (response.done) break;
      }
    }

    try {
      await runBatchPhase("destinations", preview.source.destinations);

      setPhase("Event");
      setProgress({ done: 0, total: preview.source.events });
      await runBatchPhase("events", preview.source.events);

      setPhase("Ulasan");
      setProgress({ done: 0, total: preview.source.reviews });
      const reviewResult = await postJson<RunResponse>(
        "/api/admin/sync/run",
        { runId, phase: "reviews", confirmMirror: true },
      );
      runId = reviewResult.runId;
      accumulate(reviewResult.summary);
      appendErrors(reviewResult.errors);
      appendDetails(reviewResult.details);
      appendLog(
        `Ulasan: ${reviewResult.summary.inserted} baru, ${reviewResult.summary.updated} update, ${reviewResult.summary.failed} gagal.`,
      );
      setProgress({ done: 1, total: 1 });

      setPhase("Cleanup mirror");
      setProgress({ done: 0, total: 0 });
      const cleanupResult = await postJson<RunResponse>(
        "/api/admin/sync/run",
        { runId, phase: "cleanup", confirmMirror: true },
      );
      runId = cleanupResult.runId;
      accumulate(cleanupResult.summary);
      appendErrors(cleanupResult.errors);
      appendLog(
        `Cleanup: ${cleanupResult.summary.deleted} konten lokal dihapus.`,
      );

      setPhase("Finalisasi");
      setProgress({ done: 0, total: 0 });
      await postJson<RunResponse>("/api/admin/sync/run", {
        runId,
        phase: "finalize",
      });

      setProgress({ done: 1, total: 1 });
      setPhase("Selesai");

      try {
        const refreshed = await postJson<Preview>(
          "/api/admin/sync/preview",
          {},
        );
        setPreview(refreshed);
        await loadAssets();
      } catch {
        // Data sudah tersinkron; kegagalan refresh preview tidak membatalkan hasil.
      }

      setMessage("Sinkronisasi selesai.");
      setMessageKind("success");
    } catch (error) {
      const text = errorText(error);
      setMessage(text);
      setMessageKind("error");
      appendLog(`Gagal: ${text}`);

      if (runId) {
        try {
          await postJson<RunResponse>("/api/admin/sync/run", {
            runId,
            phase: "finalize",
            error: text,
          });
        } catch {
          // Abaikan kegagalan finalisasi agar error utama tetap terlihat.
        }
      }
    } finally {
      setRunning(false);
    }
  }

  async function copyUrl(asset: Asset) {
    const url = `${window.location.origin}/api/nc-image?file=${encodeURIComponent(
      asset.nextcloud_file,
    )}`;

    try {
      await navigator.clipboard.writeText(url);
      setMessage("URL gambar disalin.");
      setMessageKind("success");
    } catch {
      setMessage("Gagal menyalin URL.");
      setMessageKind("error");
    }
  }

  async function handleThumbnails() {
    if (thumbnailBusy || running || warming) return;

    setThumbnailBusy(true);
    setMessage(null);
    setThumbnailProgress({ done: 0, total: assets.length });

    let offset = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;

    try {
      while (true) {
        const result = await postJson<VariantResponse>(
          "/api/admin/assets/variants",
          { offset, limit: 3 },
        );

        created += result.created;
        skipped += result.skipped;
        failed += result.failed;
        appendErrors(result.errors);
        setThumbnailProgress({ done: result.nextOffset, total: result.total });

        if (result.done || result.nextOffset <= result.offset) break;
        offset = result.nextOffset;
      }

      const text = `Thumbnail: ${created} dibuat, ${skipped} dilewati, ${failed} gagal.`;
      appendLog(text);
      setMessage(text);
      setMessageKind(failed > 0 ? "error" : "success");
      await loadAssets();
    } catch (error) {
      const text = errorText(error);
      setMessage(text);
      setMessageKind("error");
      appendLog(`Gagal membuat thumbnail: ${text}`);
    } finally {
      setThumbnailBusy(false);
    }
  }

  async function handleWarmCache() {
    if (warming || thumbnailBusy || running || assets.length === 0) return;

    setWarming(true);
    setMessage(null);
    setWarmProgress({ done: 0, total: assets.length });

    let done = 0;
    let failed = 0;

    try {
      for (let i = 0; i < assets.length; i += 3) {
        const batch = assets.slice(i, i + 3);
        const results = await Promise.all(
          batch.map(async (asset) => {
            try {
              const response = await fetch(
                `/api/nc-image?file=${encodeURIComponent(
                  asset.nextcloud_file,
                )}&w=${NC_IMAGE_CARD_WIDTH}`,
              );
              await response.arrayBuffer();
              return response.ok;
            } catch {
              return false;
            }
          }),
        );

        failed += results.filter((ok) => !ok).length;
        done += batch.length;
        setWarmProgress({ done, total: assets.length });
      }

      const text = `Cache dihangatkan: ${assets.length - failed} berhasil, ${failed} gagal.`;
      setMessage(text);
      setMessageKind(failed > 0 ? "error" : "success");
    } catch (error) {
      setMessage(errorText(error));
      setMessageKind("error");
    } finally {
      setWarming(false);
    }
  }

  const deletedDestinations = preview?.destinations.localOnly ?? [];
  const deletedEvents = preview?.events.localOnly ?? [];
  const hasDeletions = deletedDestinations.length + deletedEvents.length > 0;
  const progressPercent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : running
        ? 10
        : 0;

  const alertClass =
    messageKind === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : messageKind === "success"
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">
            Sinkronisasi Sumber
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#737373]">
            Salin data publik destinasi dan event dari situs sumber, lalu
            simpan gambar ke Nextcloud. Mode mirror akan menghapus konten lokal
            yang tidak ada di sumber.
          </p>
        </div>
        <button
          onClick={handlePreview}
          disabled={previewLoading || running}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:bg-zinc-50 disabled:opacity-50"
        >
          {previewLoading ? "Memeriksa..." : "Cek Sumber"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${alertClass}`}>
          {message}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <InfoCard
          label="URL Sumber"
          value={preview?.sourceBaseUrl ?? "Belum diperiksa"}
          small
        />
        <InfoCard label="Mode" value="Mirror" />
        <InfoCard
          label="Preview"
          value={
            preview
              ? `${preview.destinations.delete + preview.events.delete} konten akan dihapus`
              : "Klik Cek Sumber"
          }
          small
        />
      </div>

      {preview && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Destinasi"
              value={preview.source.destinations}
              detail={`${preview.destinations.new} baru · ${preview.destinations.update} update`}
            />
            <Stat
              label="Event"
              value={preview.source.events}
              detail={`${preview.events.new} baru · ${preview.events.update} update`}
            />
            <Stat
              label="Gambar"
              value={preview.source.images}
              detail={`${preview.assets.existing} sudah ada · ${preview.assets.missing} perlu disalin`}
            />
            <Stat
              label="Ulasan"
              value={preview.source.reviews}
              detail="Approved dari sumber"
            />
          </div>

          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              hasDeletions
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-zinc-200 bg-white text-[#737373]"
            }`}
          >
            {hasDeletions ? (
              <>
                <p className="font-medium">
                  Mode mirror akan menghapus{" "}
                  {preview.destinations.delete + preview.events.delete} konten
                  lokal yang tidak ada di sumber.
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium">
                    Lihat daftar konten yang akan dihapus
                  </summary>
                  <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-medium">
                        Destinasi ({deletedDestinations.length})
                      </p>
                      {deletedDestinations.length === 0 ? (
                        <p className="text-amber-700">-</p>
                      ) : (
                        <ul className="max-h-40 space-y-0.5 overflow-auto">
                          {deletedDestinations.map((item) => (
                            <li key={item.id}>
                              • {item.title}{" "}
                              <span className="text-amber-700">
                                ({item.slug})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 font-medium">
                        Event ({deletedEvents.length})
                      </p>
                      {deletedEvents.length === 0 ? (
                        <p className="text-amber-700">-</p>
                      ) : (
                        <ul className="max-h-40 space-y-0.5 overflow-auto">
                          {deletedEvents.map((item) => (
                            <li key={item.id}>
                              • {item.title}{" "}
                              <span className="text-amber-700">
                                ({item.slug})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              </>
            ) : (
              <p>Tidak ada konten lokal yang akan dihapus.</p>
            )}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSync}
              disabled={running || previewLoading}
              className="rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052a3] disabled:opacity-50"
            >
              {running ? "Sinkronisasi berjalan..." : "Sinkronkan Sekarang"}
            </button>
            <p className="text-xs text-[#737373]">
              Proses berjalan bertahap agar aman terhadap batas waktu server.
            </p>
          </div>
        </>
      )}

      {(running || logs.length > 0) && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-[#1a1a1a]">
              {phase || "Menunggu"}
            </p>
            <p className="text-xs text-[#737373]">
              {progress.total > 0
                ? `${progress.done}/${progress.total}`
                : ""}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#0066cc] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#737373] sm:grid-cols-3">
            <span>Baru: {totals.inserted}</span>
            <span>Update: {totals.updated}</span>
            <span>Dihapus: {totals.deleted}</span>
            <span>Gambar disalin: {totals.imagesCopied}</span>
            <span>Gambar dilewati: {totals.imagesSkipped}</span>
            <span>Gagal: {totals.failed}</span>
          </div>

          <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-[#525252]">
            {logs.length === 0 ? (
              <p>Belum ada log.</p>
            ) : (
              logs.map((line, index) => <p key={index}>{line}</p>)
            )}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <details className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <summary className="cursor-pointer font-medium">
            {errors.length} error selama sinkronisasi
          </summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
            {errors.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1a1a1a]">
              Aset ({assets.length})
            </h2>
            <p className="text-xs text-[#737373]">
              Gambar hasil sinkronisasi yang tersimpan di Nextcloud.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleThumbnails}
              disabled={thumbnailBusy || warming || running || assets.length === 0}
              className="rounded border border-[#0066cc] px-3 py-1.5 text-xs font-medium text-[#0066cc] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {thumbnailBusy
                ? `Thumbnail ${thumbnailProgress.done}/${thumbnailProgress.total}`
                : "Siapkan thumbnail"}
            </button>
            <button
              onClick={handleWarmCache}
              disabled={warming || thumbnailBusy || running || assets.length === 0}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-[#737373] hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {warming
                ? `Cache ${warmProgress.done}/${warmProgress.total}`
                : "Hangatkan cache"}
            </button>
            <button
              onClick={loadAssets}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-[#737373] hover:bg-zinc-50"
            >
              Muat ulang
            </button>
          </div>
        </div>

        {(thumbnailBusy || warming) && (
          <p className="mb-3 text-xs text-[#737373]">
            {thumbnailBusy
              ? `Membuat thumbnail ${thumbnailProgress.done}/${thumbnailProgress.total}...`
              : `Menghangatkan cache ${warmProgress.done}/${warmProgress.total}...`}
          </p>
        )}

        {assets.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#737373]">
            Belum ada asset.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-lg border border-zinc-100"
              >
                <div className="relative aspect-square bg-zinc-100">
                  <Image
                    src={withImageWidth(
                      `/api/nc-image?file=${encodeURIComponent(
                        asset.nextcloud_file,
                      )}`,
                      NC_IMAGE_CARD_WIDTH,
                    )}
                    alt={asset.filename ?? asset.nextcloud_file}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-2">
                  <p
                    className="truncate text-xs font-medium text-[#1a1a1a]"
                    title={asset.filename ?? asset.nextcloud_file}
                  >
                    {asset.filename ?? asset.nextcloud_file}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#737373]">
                    {asset.source_type ?? "asset"} · {formatBytes(asset.size)}
                  </p>
                  <button
                    onClick={() => copyUrl(asset)}
                    className="mt-1.5 text-[11px] font-medium text-[#0066cc] hover:underline"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-[#737373]">{label}</p>
      <p
        className={`mt-1 font-medium text-[#1a1a1a] ${
          small ? "break-all text-xs" : "text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <p className="text-2xl font-bold text-[#1a1a1a]">{value}</p>
      <p className="text-xs font-medium text-[#525252]">{label}</p>
      <p className="mt-1 text-[11px] text-[#737373]">{detail}</p>
    </div>
  );
}
