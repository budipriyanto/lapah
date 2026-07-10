"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Destination, DestinationImage } from "@/utils/supabase/types";
import DestinationCard from "@/components/DestinationCard";
import ScrollSection from "@/components/ScrollSection";
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

function SectionSkeleton() {
  return (
    <div className="px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-56 shrink-0 animate-pulse rounded-xl bg-white shadow-sm">
              <div className="aspect-[3/2] rounded-t-xl bg-zinc-200" />
              <div className="space-y-1.5 p-2.5">
                <div className="h-3 w-3/4 rounded bg-zinc-200" />
                <div className="h-2.5 w-1/2 rounded bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExploreContent() {
  const { query } = useSearchContext();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [images, setImages] = useState<DestinationImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { isBookmarked } = useBookmarks();

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("destinations").select("*").order("title"),
      supabase.from("destination_images").select("*").order("image_order"),
    ]).then(([destResult, imgResult]) => {
      if (destResult.data) setDestinations(destResult.data);
      if (imgResult.data) setImages(imgResult.data);
      setLoading(false);
    });
  }, []);

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

  const wisataDestinations = useMemo(
    () => destinations.filter((d) => d.category === "wisata"),
    [destinations]
  );

  const kulinerDestinations = useMemo(
    () => destinations.filter((d) => d.category === "kuliner"),
    [destinations]
  );

  const filteredWisata = useMemo(
    () => wisataDestinations.filter((d) => filterBySearch(d, query)),
    [wisataDestinations, query]
  );

  const filteredKuliner = useMemo(
    () => kulinerDestinations.filter((d) => filterBySearch(d, query)),
    [kulinerDestinations, query]
  );

  const hasResults = filteredWisata.length > 0 || filteredKuliner.length > 0;

  if (loading) {
    return (
      <div className="py-6">
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 h-14 animate-pulse rounded-xl bg-white shadow-sm" />
        </div>
      </div>
        <div className="mb-6">
          <div className="mb-3 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
              <div className="h-5 w-16 rounded bg-zinc-200" />
            </div>
          </div>
          <SectionSkeleton />
        </div>
        <div>
          <div className="mb-3 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
              <div className="h-5 w-16 rounded bg-zinc-200" />
            </div>
          </div>
          <SectionSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Weather */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <WeatherCard />
          <PrayerCard />
        </div>
      </div>

      {!hasResults ? (
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">Tidak ditemukan</p>
            <p className="mt-1 text-sm">
              Coba ubah kata kunci pencarian
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Wisata */}
          {filteredWisata.length > 0 && (
            <ScrollSection title="Wisata">
              {filteredWisata.map((dest) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  images={imagesByDestination.get(dest.id) ?? []}
                  isBookmarked={isBookmarked(dest.id)}
                  compact
                />
              ))}
            </ScrollSection>
          )}

          {/* Kuliner */}
          {filteredKuliner.length > 0 && (
            <ScrollSection title="Kuliner">
              {filteredKuliner.map((dest) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  images={imagesByDestination.get(dest.id) ?? []}
                  isBookmarked={isBookmarked(dest.id)}
                  compact
                />
              ))}
            </ScrollSection>
          )}
        </>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return <ExploreContent />;
}
