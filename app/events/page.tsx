"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Event, EventImage } from "@/utils/types";
import EventCard from "@/components/EventCard";
import PageHeader from "@/components/PageHeader";
import { useSearchContext } from "@/contexts/SearchContext";

type EventWithImages = Event & { images: EventImage[] };

function filterBySearch(evt: { title: string; location?: string | null }, q: string) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    evt.title.toLowerCase().includes(query) ||
    evt.location?.toLowerCase().includes(query)
  );
}

export default function EventsPage() {
  const { query } = useSearchContext();

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events");
      const json = await res.json();
      return (json.success ? json.data : []) as EventWithImages[];
    },
  });

  const filtered = useMemo(
    () => (events ?? []).filter((e) => filterBySearch(e, query)),
    [events, query]
  );

  if (isLoading) {
    return (
      <div className="py-6">
        <PageHeader title="Acara" color="acara" icon="📅" />
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="aspect-[16/9] bg-zinc-200" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-zinc-200" />
                  <div className="h-3 w-1/2 rounded bg-zinc-200" />
                  <div className="h-3 w-1/3 rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-6">
        <PageHeader title="Acara" color="acara" icon="📅" />
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">Belum ada acara</p>
          </div>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-6">
        <PageHeader title="Acara" color="acara" icon="📅" />
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">Tidak ditemukan</p>
            <p className="mt-1 text-sm">Coba ubah kata kunci pencarian</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <PageHeader title="Acara" color="acara" icon="📅" />
      <div className="px-4 sm:px-6 pb-6">
        <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
          {filtered.map((evt, i) => (
            <EventCard
              key={evt.id}
              event={evt}
              images={evt.images ?? []}
              priority={i < 4}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
