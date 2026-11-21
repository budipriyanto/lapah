"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { DestinationImage } from "@/utils/supabase/types";
import { formatDistance } from "@/utils/geo";
import { withImageWidth } from "@/utils/image-url";

export const MAP_CATEGORY_META = {
  wisata: { label: "Wisata", color: "#16a34a", icon: "🏖️" },
  penginapan: { label: "Penginapan", color: "#0066cc", icon: "🛏️" },
  kuliner: { label: "Kuliner", color: "#ea580c", icon: "🍜" },
} as const;

export type MapCategory = keyof typeof MAP_CATEGORY_META;

export interface NearestPlace {
  id: string;
  title: string;
  slug: string;
  category: MapCategory;
  lat: number;
  lon: number;
  distanceKm: number;
}

interface NearestPlaceSliderProps {
  places: NearestPlace[];
  imagesByDestination?: Map<string, DestinationImage[]>;
  categoryLabel?: string;
  onSelect: (place: NearestPlace) => void;
}

function getCardImage(images?: DestinationImage[]): string {
  const hero = images?.find((image) => image.is_hero) ?? images?.[0];
  return withImageWidth(hero?.image_url, 320) ?? "/lamtim.jpeg";
}

export default function NearestPlaceSlider({
  places,
  imagesByDestination,
  categoryLabel,
  onSelect,
}: NearestPlaceSliderProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const delta = event.clientX - drag.startX;
      if (Math.abs(delta) > 4) {
        drag.moved = true;
        setDragging(true);
      }

      if (drag.moved) {
        strip.scrollLeft = drag.scrollLeft - delta;
      }
    };

    const onPointerUp = () => {
      const drag = dragRef.current;
      if (!drag) return;

      dragRef.current = null;
      suppressClickRef.current = drag.moved;
      setDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const strip = stripRef.current;
    if (!strip) return;

    suppressClickRef.current = false;
    dragRef.current = {
      startX: event.clientX,
      scrollLeft: strip.scrollLeft,
      moved: false,
    };
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  if (places.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-black/35 via-black/10 to-transparent px-2 pb-2 pt-10 sm:px-3 sm:pb-3">
      <div className="pointer-events-auto">
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#1a1a1a] shadow-sm">
            Destinasi Terdekat{categoryLabel ? ` ${categoryLabel}` : ""}
          </span>
          <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-medium text-white">
            dari lokasi Anda
          </span>
        </div>

        <div
          ref={stripRef}
          onPointerDown={handlePointerDown}
          onClickCapture={handleClickCapture}
          onDragStart={(event) => event.preventDefault()}
          className={`flex touch-pan-x select-none snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {places.map((place) => {
            const meta = MAP_CATEGORY_META[place.category];
            const image = getCardImage(imagesByDestination?.get(place.id));

            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onSelect(place)}
                aria-label={`Fokuskan ${place.title} di peta`}
                className="flex w-56 shrink-0 snap-start items-center gap-2 rounded-xl border border-white/40 bg-white/25 p-2 text-left shadow-lg backdrop-blur-md transition-transform hover:-translate-y-0.5"
              >
                <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <Image
                    src={image}
                    alt={place.title}
                    fill
                    unoptimized
                    draggable={false}
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide"
                    style={{ color: meta.color }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    {meta.icon} {meta.label}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-[#1a1a1a]">
                    {place.title}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[#737373]">
                    {formatDistance(place.distanceKm)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
