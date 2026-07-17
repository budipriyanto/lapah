"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import type { Event, EventImage } from "@/utils/supabase/types";

interface EventCardProps {
  event: Event;
  images: EventImage[];
  compact?: boolean;
}

function formatDate(dateStr: string, endStr?: string | null) {
  const start = new Date(dateStr + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const formatted = start.toLocaleDateString("id-ID", opts);
  if (!endStr) return formatted;
  const end = new Date(endStr + "T00:00:00");
  if (+start === +end) return formatted;
  return `${start.getDate()}–${end.toLocaleDateString("id-ID", opts)}`;
}

function getHeroImage(images: EventImage[]): string | null {
  const hero = images.find((img) => img.is_hero);
  return (hero ?? images[0])?.image_url ?? null;
}

export default function EventCard({ event, images, compact = false }: EventCardProps) {
  const heroUrl = useMemo(() => getHeroImage(images), [images]);
  const dateLabel = formatDate(event.date_start, event.date_end);

  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group block overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md ${
        compact ? "w-56 shrink-0 snap-start" : ""
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes={compact ? "224px" : "(max-width: 640px) 100vw, 50vw"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#0066cc]/10">
            <span className="text-4xl">📅</span>
          </div>
        )}
      </div>
      <div className={compact ? "p-2.5" : "p-3"}>
        <h3 className={`font-semibold text-[#1a1a1a] truncate ${compact ? "text-sm" : ""}`}>
          {event.title}
        </h3>
        {event.location && (
          <p className="mt-0.5 text-xs text-[#737373] truncate">
            📍 {event.location}
          </p>
        )}
        <p className="mt-0.5 text-xs text-[#0066cc]">
          📅 {dateLabel}
          {event.time ? ` · ${event.time}` : ""}
        </p>
      </div>
    </Link>
  );
}
