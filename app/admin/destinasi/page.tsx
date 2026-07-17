"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import type { Destination } from "@/utils/supabase/types";

export default function AdminDestinasi() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const perPage = 10;
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("destinations")
      .select("*")
      .order("title")
      .then(({ data }) => {
        if (data) setDestinations(data);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      destinations.filter((d) =>
        d.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [destinations, debouncedSearch],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * perPage, safePage * perPage),
    [filtered, safePage],
  );

  async function handleDelete(id: string) {
    if (!confirm("Hapus destinasi ini? Semua gambar & ulasan terkait akan ikut terhapus.")) return;
    await supabase.from("destinations").delete().eq("id", id);
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-8 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Destinasi</h1>
        <Link
          href="/admin/destinasi/tambah"
          className="rounded-lg bg-[#0066cc] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0052a3]"
        >
          + Tambah
        </Link>
      </div>

      <input
        type="text"
        placeholder="Cari destinasi..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="mb-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc]"
      />

      {destinations.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#737373]">
          Belum ada destinasi
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#737373]">
          Tidak ditemukan
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {paged.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1a1a1a]">
                    {d.title}
                  </p>
                  <p className="text-xs text-[#737373]">
                    {d.category} · {d.location || "-"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/admin/destinasi/edit/${d.id}`}
                    className="rounded px-2 py-1 text-xs text-[#0066cc] hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-[#737373]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded border border-zinc-200 px-3 py-1.5 disabled:opacity-30 hover:bg-zinc-50"
              >
                Sebelumnya
              </button>
              <span>
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded border border-zinc-200 px-3 py-1.5 disabled:opacity-30 hover:bg-zinc-50"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
