"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import type { Review } from "@/utils/supabase/types";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<(Review & { dest_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reviews")
      .select("*, destinations!inner(title)")
      .eq("user_id", user.id)
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
  }, [user]);

  async function handleDelete(reviewId: string) {
    if (!confirm("Hapus ulasan ini?")) return;
    await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", user?.id);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="mb-4 text-sm text-[#737373]">Login untuk melihat profil</p>
        <Link
          href="/auth/login"
          className="inline-block rounded-lg bg-[#0066cc] px-4 py-2 text-sm font-medium text-white"
        >
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0066cc] text-xl font-bold text-white">
            {user.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-semibold text-[#1a1a1a]">{user.email}</p>
            <p className="text-xs text-[#737373]">{user.id}</p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-[#1a1a1a]">
        Ulasan Saya ({reviews.length})
      </h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 h-4 w-1/3 rounded bg-zinc-200" />
              <div className="h-3 w-2/3 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#737373]">
          Kamu belum menulis ulasan
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <Link
                  href={`/destinasi/${r.destination_id}`}
                  className="text-sm font-medium text-[#0066cc] hover:underline"
                >
                  {r.dest_title || "(destinasi)"}
                </Link>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Hapus
                </button>
              </div>
              <div className="mb-1 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill={i < r.rating ? "#f59e0b" : "none"}
                    stroke={i < r.rating ? "#f59e0b" : "#d4d4d4"}
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              {r.comment && (
                <p className="text-sm text-[#737373]">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
