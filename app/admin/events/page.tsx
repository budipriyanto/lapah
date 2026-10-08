"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Event } from "@/utils/types";

export default function AdminEvents() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    fetch("/api/events")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (stale) return;
        if (json?.success && Array.isArray(json.data)) {
          setEvents(json.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!stale) setIsLoading(false);
      });
    return () => {
      stale = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Hapus event ini?")) return;
    setDeleting(id);
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Events</h1>
        <button
          onClick={() => router.push("/admin/events/tambah")}
          className="rounded-lg bg-[#0066cc] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0052a3]"
        >
          + Tambah
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-200" />
      ) : !events || events.length === 0 ? (
        <p className="text-sm text-[#737373]">Belum ada event</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[#737373]">
                <th className="pb-2 pr-4 font-medium">Judul</th>
                <th className="pb-2 pr-4 font-medium">Tanggal</th>
                <th className="pb-2 pr-4 font-medium">Lokasi</th>
                <th className="pb-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 text-[#1a1a1a]">{evt.title}</td>
                  <td className="py-2 pr-4 text-[#737373]">{String(evt.date_start).slice(0, 10)}{evt.date_end ? ` – ${String(evt.date_end).slice(0, 10)}` : ""}</td>
                  <td className="py-2 pr-4 text-[#737373]">{evt.location || "–"}</td>
                  <td className="py-2">
                    <button
                      onClick={() => router.push(`/admin/events/edit/${evt.id}`)}
                      className="mr-2 text-xs text-[#0066cc] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(evt.id)}
                      disabled={deleting === evt.id}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      {deleting === evt.id ? "..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
