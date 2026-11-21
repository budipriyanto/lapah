"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type {
  DestinationImage,
  Event,
  EventImage,
} from "@/utils/supabase/types";
import EventCard from "@/components/EventCard";
import ScrollSection from "@/components/ScrollSection";
import { useAllData } from "@/hooks/useSupabaseQuery";

const WeatherCard = dynamic(() => import("@/components/WeatherCard"), { ssr: false });
const PrayerCard = dynamic(() => import("@/components/PrayerCard"), { ssr: false });
const HomeMap = dynamic(() => import("@/components/HomeMap"), {
  ssr: false,
  loading: () => (
    <div className="mb-6 h-[320px] animate-pulse rounded-xl bg-white shadow-sm sm:h-[400px]" />
  ),
});
import { useSearchContext } from "@/contexts/SearchContext";

const HOME_LIMIT = 10;

function filterEventBySearch(evt: { title: string; location?: string | null }, q: string) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    evt.title.toLowerCase().includes(query) ||
    evt.location?.toLowerCase().includes(query)
  );
}

function sortEvents(list: Event[]): Event[] {
  return [...list].sort(
    (a, b) =>
      (b.date_start ?? "").localeCompare(a.date_start ?? "") ||
      a.title.localeCompare(b.title, "id"),
  );
}

function ExploreContent() {
  const { query } = useSearchContext();
  const { data, isLoading } = useAllData();

  const imagesByDestination = useMemo(() => {
    if (!data) return new Map<string, DestinationImage[]>();
    const map = new Map<string, DestinationImage[]>();
    for (const img of data.images) {
      const existing = map.get(img.destination_id);
      if (existing) {
        existing.push(img);
      } else {
        map.set(img.destination_id, [img]);
      }
    }
    return map;
  }, [data]);

  const eventImagesByEvent = useMemo(() => {
    if (!data) return new Map<string, EventImage[]>();
    const map = new Map<string, EventImage[]>();
    for (const img of data.eventImages) {
      const existing = map.get(img.event_id);
      if (existing) {
        existing.push(img);
      } else {
        map.set(img.event_id, [img]);
      }
    }
    return map;
  }, [data]);

  const eventsList = useMemo(
    () => sortEvents(data?.events ?? []).slice(0, HOME_LIMIT),
    [data]
  );

  const filteredEvents = useMemo(
    () => eventsList.filter((e) => filterEventBySearch(e, query)),
    [eventsList, query]
  );

  const hasResults = filteredEvents.length > 0;

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
                <div key={i} className="w-48 shrink-0 animate-pulse rounded-xl bg-white shadow-sm">
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
          <HomeMap
            destinations={data?.destinations ?? []}
            imagesByDestination={imagesByDestination}
          />
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
        <ScrollSection title="Event" href="/events">
          {filteredEvents.map((evt, i) => (
            <EventCard
              key={evt.id}
              event={evt}
              images={eventImagesByEvent.get(evt.id) ?? []}
              compact
              priority={i < 4}
            />
          ))}
        </ScrollSection>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return <ExploreContent />;
}
