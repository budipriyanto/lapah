"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Review } from "@/utils/supabase/types";

export default function AdminUlasan() {
  const [reviews, setReviews] = useState<(Review & { dest_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*, destinations!inner(title)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setReviews(
            data.map((r: any) => ({
              ...r,
              dest_title: r.destinations?.title ?? "",
            })),
          );
        }
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Hapus ulasan ini?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
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
      <h1 className="mb-6 text-xl font-bold text-[#1a1a1a]">Ulasan ({reviews.length})</h1>

      {reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#737373]">Belum ada ulasan</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1a1a1a]">
                    {r.dest_title || "(destinasi)"}
                  </p>
                  <p className="text-xs text-[#737373]">
                    {r.user_name} · {r.rating}/5 ·{" "}
                    {new Date(r.created_at).toLocaleDateString("id-ID")}
                  </p>
                  {r.comment && (
                    <p className="mt-1 text-sm text-[#737373]">{r.comment}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
