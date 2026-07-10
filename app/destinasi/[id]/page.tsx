"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { Destination, DestinationImage, Review } from "@/utils/supabase/types";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isBookmarked, toggle } = useBookmarks();

  const [destination, setDestination] = useState<Destination | null>(null);
  const [images, setImages] = useState<DestinationImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const supabase = createClient();
    Promise.all([
      supabase.from("destinations").select("*").eq("id", id).single(),
      supabase
        .from("destination_images")
        .select("*")
        .eq("destination_id", id)
        .order("image_order"),
      supabase
        .from("reviews")
        .select("*")
        .eq("destination_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([destResult, imgResult, revResult]) => {
      const dest = destResult.data;
      if (destResult.error || !dest) {
        notFound();
        return;
      }
      setDestination(dest);
      setImages(imgResult.data ?? []);
      setReviews(revResult.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRating === 0) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").insert({
      destination_id: id,
      user_name: formName.trim() || "Anonim",
      rating: formRating,
      comment: formComment.trim() || null,
    });

    if (!error) {
      const { data: newReviews } = await supabase
        .from("reviews")
        .select("*")
        .eq("destination_id", id)
        .order("created_at", { ascending: false });
      if (newReviews) setReviews(newReviews);

      setFormName("");
      setFormRating(0);
      setFormComment("");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="aspect-[16/9] rounded-xl bg-zinc-200" />
          <div className="h-8 w-2/3 rounded bg-zinc-200" />
          <div className="h-4 w-1/3 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-200" />
          <div className="h-4 w-5/6 rounded bg-zinc-200" />
        </div>
      </div>
    );
  }

  if (!destination) return null;

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_hero && !b.is_hero) return -1;
    if (!a.is_hero && b.is_hero) return 1;
    return a.image_order - b.image_order;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Image Gallery */}
      {sortedImages.length > 0 && (
        <div className="mb-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={sortedImages[selectedImage]?.image_url}
              alt={destination.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          {sortedImages.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {sortedImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === selectedImage
                      ? "border-[#0066cc]"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt={`${destination.title} ${i + 1}`}
                    width={80}
                    height={60}
                    className="h-15 w-20 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title & Category */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
            {destination.title}
          </h1>
          <span className="mt-1 inline-block rounded-full bg-[#0066cc]/10 px-3 py-0.5 text-xs font-medium text-[#0066cc]">
            {destination.category === "wisata" ? "Wisata" : "Kuliner"}
            {destination.subcategory ? ` · ${destination.subcategory}` : ""}
          </span>
        </div>
      </div>

      {/* Info Bar */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm text-[#737373]">
        {destination.location && (
          <div className="flex items-center gap-1.5">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{destination.location}</span>
          </div>
        )}
        {destination.opening_hours && (
          <div className="flex items-center gap-1.5">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{destination.opening_hours}</span>
          </div>
        )}
        {destination.price_range && (
          <div className="flex items-center gap-1.5">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>{destination.price_range}</span>
          </div>
        )}
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <svg className="shrink-0 text-amber-500" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[#1a1a1a] font-medium">{averageRating}</span>
            <span>({reviews.length} ulasan)</span>
          </div>
        )}
      </div>

      {/* Description */}
      {destination.description && (
        <p className="mb-6 leading-relaxed text-[#1a1a1a]">
          {destination.description}
        </p>
      )}

      {/* Address */}
      {destination.address && (
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-[#737373] uppercase tracking-wide">
            Alamat
          </h2>
          <p className="text-[#1a1a1a]">{destination.address}</p>
        </div>
      )}

      {/* Navigate */}
      {destination.latitude && destination.longitude && (
        <div className="mb-8">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0052a3]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Buka di Google Maps
          </a>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mb-24 border-t border-zinc-100 pt-8">
        <h2 className="mb-6 text-lg font-semibold text-[#1a1a1a]">
          Ulasan {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {/* Review Form */}
        <form
          onSubmit={handleSubmitReview}
          className="mb-8 rounded-xl bg-white p-4 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-medium text-[#1a1a1a]">
            Tulis Ulasan
          </h3>
          <input
            type="text"
            placeholder="Nama (opsional)"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc]"
          />
          <div className="mb-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormRating(star)}
                className="transition-colors"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill={star <= formRating ? "#f59e0b" : "none"}
                  stroke={star <= formRating ? "#f59e0b" : "#d4d4d4"}
                  strokeWidth="2"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            placeholder="Tulis komentar..."
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            rows={3}
            className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#0066cc] resize-none"
          />
          <button
            type="submit"
            disabled={formRating === 0 || submitting}
            className="rounded-lg bg-[#0066cc] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0052a3] disabled:opacity-50"
          >
            {submitting ? "Mengirim..." : "Kirim Ulasan"}
          </button>
        </form>

        {/* Review List */}
        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#737373]">
            Belum ada ulasan. Jadilah yang pertama!
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-zinc-100 pb-4 last:border-0"
              >
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066cc]/10 text-xs font-medium text-[#0066cc]">
                    {review.user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#1a1a1a]">
                    {review.user_name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={i < review.rating ? "#f59e0b" : "none"}
                        stroke={i < review.rating ? "#f59e0b" : "#d4d4d4"}
                        strokeWidth="2"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="ml-10 text-sm leading-relaxed text-[#737373]">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button — Bookmark */}
      <button
        onClick={() => toggle(id)}
        className="fixed bottom-20 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label={isBookmarked(id) ? "Hapus bookmark" : "Tambah bookmark"}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={isBookmarked(id) ? "#0066cc" : "none"}
          stroke={isBookmarked(id) ? "#0066cc" : "#1a1a1a"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}
