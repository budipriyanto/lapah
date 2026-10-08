"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  Destination,
  DestinationImage,
  Event,
  EventImage,
} from "@/utils/types";
import DestinationCard from "@/components/DestinationCard";
import EventCard from "@/components/EventCard";
import ScrollSection from "@/components/ScrollSection";
import { useSearchContext } from "@/contexts/SearchContext";
import { useBookmarks } from "@/hooks/useBookmarks";

const WeatherCard = dynamic(() => import("@/components/WeatherCard"), {
  ssr: false,
});
const PrayerCard = dynamic(() => import("@/components/PrayerCard"), {
  ssr: false,
});

const HOME_LIMIT = 10;

type DestinationWithImages = Destination & { images: DestinationImage[] };
type EventWithImages = Event & { images: EventImage[] };

function filterBySearch(
  dest: { title: string; location?: string | null },
  q: string,
) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    dest.title.toLowerCase().includes(query) ||
    dest.location?.toLowerCase().includes(query)
  );
}

function filterEventBySearch(
  evt: { title: string; location?: string | null },
  q: string,
) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    evt.title.toLowerCase().includes(query) ||
    evt.location?.toLowerCase().includes(query)
  );
}

export default function ExploreContent() {
  const { query } = useSearchContext();
  const { isBookmarked } = useBookmarks();

  const { data, isLoading } = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [destRes, evtRes] = await Promise.all([
        fetch("/api/destinations"),
        fetch("/api/events"),
      ]);
      const destJson = await destRes.json();
      const evtJson = await evtRes.json();
      return {
        destinations: (destJson.success ? destJson.data : []) as DestinationWithImages[],
        events: (evtJson.success ? evtJson.data : []) as EventWithImages[],
      };
    },
  });

  const wisataList = useMemo(
    () =>
      (data?.destinations ?? [])
        .filter((d) => d.category === "wisata")
        .slice(0, HOME_LIMIT),
    [data],
  );

  const kulinerList = useMemo(
    () =>
      (data?.destinations ?? [])
        .filter((d) => d.category === "kuliner")
        .slice(0, HOME_LIMIT),
    [data],
  );

  const penginapanList = useMemo(
    () =>
      (data?.destinations ?? [])
        .filter((d) => d.category === "penginapan")
        .slice(0, HOME_LIMIT),
    [data],
  );

  const filteredWisata = useMemo(
    () => wisataList.filter((d) => filterBySearch(d, query)),
    [wisataList, query],
  );

  const filteredKuliner = useMemo(
    () => kulinerList.filter((d) => filterBySearch(d, query)),
    [kulinerList, query],
  );

  const filteredPenginapan = useMemo(
    () => penginapanList.filter((d) => filterBySearch(d, query)),
    [penginapanList, query],
  );

  const eventsList = useMemo(
    () => (data?.events ?? []).slice(0, HOME_LIMIT),
    [data],
  );

  const filteredEvents = useMemo(
    () => eventsList.filter((e) => filterEventBySearch(e, query)),
    [eventsList, query],
  );

  const hasResults =
    filteredWisata.length > 0 ||
    filteredKuliner.length > 0 ||
    filteredPenginapan.length > 0 ||
    filteredEvents.length > 0;

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-white shadow-sm" />
            <div className="h-20 animate-pulse rounded-xl bg-white shadow-sm" />
          </div>
        </div>
        <div className="mt-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 h-5 w-20 rounded bg-zinc-200" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-48 shrink-0 animate-pulse rounded-xl bg-white shadow-sm"
                >
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

      {!hasResults ? (
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">Tidak ditemukan</p>
            <p className="mt-1 text-sm">Coba ubah kata kunci pencarian</p>
          </div>
        </div>
      ) : (
        <>
          {filteredWisata.length > 0 && (
            <ScrollSection title="Wisata" href="/wisata">
              {filteredWisata.map((dest, i) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  images={dest.images ?? []}
                  isBookmarked={isBookmarked(dest.id)}
                  compact
                  priority={i < 4}
                />
              ))}
            </ScrollSection>
          )}

          {filteredKuliner.length > 0 && (
            <ScrollSection title="Kuliner" href="/kuliner">
              {filteredKuliner.map((dest, i) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  images={dest.images ?? []}
                  isBookmarked={isBookmarked(dest.id)}
                  compact
                  priority={i < 4}
                />
              ))}
            </ScrollSection>
          )}

          {filteredPenginapan.length > 0 && (
            <ScrollSection title="Penginapan" href="/penginapan">
              {filteredPenginapan.map((dest, i) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  images={dest.images ?? []}
                  isBookmarked={isBookmarked(dest.id)}
                  compact
                  priority={i < 4}
                />
              ))}
            </ScrollSection>
          )}

          {filteredEvents.length > 0 && (
            <ScrollSection title="Event" href="/events">
              {filteredEvents.map((evt, i) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  images={evt.images ?? []}
                  compact
                  priority={i < 4}
                />
              ))}
            </ScrollSection>
          )}
        </>
      )}
    </div>
  );
}
