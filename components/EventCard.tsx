"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Event, EventImage } from "@/utils/types";

interface EventCardProps {
  event: Event;
  images: EventImage[];
  compact?: boolean;
  priority?: boolean;
}

function formatDate(dateStr: string, endStr?: string | null) {
  const start = new Date(dateStr);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const formatted = start.toLocaleDateString("id-ID", opts);
  if (!endStr) return formatted;
  const end = new Date(endStr);
  if (+start === +end) return formatted;
  return `${start.getDate()}–${end.toLocaleDateString("id-ID", opts)}`;
}

function getHeroImage(images: EventImage[]): string | null {
  const hero = images.find((img) => img.is_hero);
  return (hero ?? images[0])?.image_url ?? null;
}

export default function EventCard({ event, images, compact = false, priority = false }: EventCardProps) {
  const heroUrl = useMemo(() => getHeroImage(images), [images]);
  const [imgFailed, setImgFailed] = useState(false);
  const useFallback = imgFailed || !heroUrl;
  const dateLabel = formatDate(event.date_start, event.date_end);

  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group block overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md ${
        compact ? "w-56 shrink-0 snap-start" : ""
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100">
        {useFallback ? (
          <Image
            src="/lamtim.jpeg"
            alt={event.title}
            fill
            className="object-cover"
            sizes={compact ? "224px" : "(max-width: 640px) 100vw, 50vw"}
            priority={priority}
          />
        ) : (
          <Image
            src={heroUrl as string}
            alt={event.title}
            fill
            onError={() => setImgFailed(true)}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes={compact ? "224px" : "(max-width: 640px) 100vw, 50vw"}
            priority={priority}
          />
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
