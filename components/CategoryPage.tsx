"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Destination, DestinationImage } from "@/utils/supabase/types";
import DestinationCard from "@/components/DestinationCard";
import WeatherCard from "@/components/WeatherCard";
import PrayerCard from "@/components/PrayerCard";
import { useSearchContext } from "@/contexts/SearchContext";
import { useBookmarks } from "@/hooks/useBookmarks";

function filterBySearch(dest: Destination, q: string) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    dest.title.toLowerCase().includes(query) ||
    dest.location?.toLowerCase().includes(query)
  );
}

export default function CategoryPage({
  category,
}: {
  category: "wisata" | "kuliner";
}) {
  const { query } = useSearchContext();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [images, setImages] = useState<DestinationImage[]>([]);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isBookmarked } = useBookmarks();

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("destinations")
        .select("*")
        .eq("category", category)
        .order("title"),
      supabase.from("destination_images").select("*").order("image_order"),
    ]).then(([destResult, imgResult]) => {
      if (destResult.data) setDestinations(destResult.data);
      if (imgResult.data) setImages(imgResult.data);
      setLoading(false);
    });
  }, [category]);

  const imagesByDestination = useMemo(() => {
    const map = new Map<string, DestinationImage[]>();
    for (const img of images) {
      const existing = map.get(img.destination_id);
      if (existing) {
        existing.push(img);
      } else {
        map.set(img.destination_id, [img]);
      }
    }
    return map;
  }, [images]);

  const subcategories = useMemo(() => {
    const set = new Set<string>();
    for (const d of destinations) {
      if (d.subcategory) set.add(d.subcategory);
    }
    return [...set].sort();
  }, [destinations]);

  const filtered = useMemo(
    () =>
      destinations.filter(
        (d) =>
          filterBySearch(d, query) &&
          (activeSubcategory === null || d.subcategory === activeSubcategory)
      ),
    [destinations, query, activeSubcategory]
  );

  const title = category === "wisata" ? "Wisata" : "Kuliner";

  if (loading) {
    return (
      <div className="py-6">
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 h-14 animate-pulse rounded-xl bg-white shadow-sm" />
          </div>
        </div>
        <div className="mb-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-zinc-200" />
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="aspect-[4/3] bg-zinc-200" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-zinc-200" />
                  <div className="h-3 w-1/3 rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <WeatherCard />
          <PrayerCard />
        </div>
      </div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="mb-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveSubcategory(null)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeSubcategory === null
                    ? "bg-[#0066cc] text-white"
                    : "bg-zinc-100 text-[#737373] hover:bg-zinc-200"
                }`}
              >
                Semua
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubcategory(sub)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    activeSubcategory === sub
                      ? "bg-[#0066cc] text-white"
                      : "bg-zinc-100 text-[#737373] hover:bg-zinc-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">
              Belum ada destinasi {title.toLowerCase()}
            </p>
            <p className="mt-1 text-sm">
              Coba ubah kata kunci pencarian
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 pb-6">
          <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
            {filtered.map((dest) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                images={imagesByDestination.get(dest.id) ?? []}
                isBookmarked={isBookmarked(dest.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
