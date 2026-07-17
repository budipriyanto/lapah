"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { useEventById, useEventImagesByEventId } from "@/hooks/useSupabaseQuery";
import ShareButton from "@/components/ShareButton";

function formatDate(dateStr: string, endStr?: string | null) {
  const start = new Date(dateStr + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const formatted = start.toLocaleDateString("id-ID", opts);
  if (!endStr) return formatted;
  const end = new Date(endStr + "T00:00:00");
  if (+start === +end) return formatted;
  return `${start.getDate()} – ${end.toLocaleDateString("id-ID", opts)}`;
}

export default function EventDetailClient({ id }: { id: string }) {
  const { data: event, isLoading } = useEventById(id);
  const { data: images = [] } = useEventImagesByEventId(id);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!isLoading && !event) {
      notFound();
    }
  }, [isLoading, event]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="aspect-[16/9] rounded-xl bg-zinc-200" />
          <div className="h-8 w-2/3 rounded bg-zinc-200" />
          <div className="h-4 w-1/2 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-200" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const sortedImages = [...images].sort((a, b) => a.image_order - b.image_order);
  const dateLabel = formatDate(event.date_start, event.date_end);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {sortedImages.length > 0 && (
        <div className="mb-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={sortedImages[selectedImage]?.image_url}
              alt={event.title}
              fill
              className="object-contain"
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
                    i === selectedImage ? "border-[#0066cc]" : "border-transparent"
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt={`${event.title} ${i + 1}`}
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

      <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl mb-3">
        {event.title}
      </h1>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-[#737373]">
        {event.location && (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{dateLabel}</span>
        </div>
        {event.time && (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{event.time}</span>
          </div>
        )}
      </div>

      {event.description && (
        <p className="leading-relaxed text-[#1a1a1a] whitespace-pre-line">
          {event.description}
        </p>
      )}

      <div className="h-20" />

      <div className="fixed bottom-20 right-6 z-[60] flex flex-col gap-3">
        <ShareButton title={event.title} text={event.description ?? undefined} />
      </div>
    </div>
  );
}
