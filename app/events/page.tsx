"use client";

import { useMemo } from "react";
import { useEvents, useEventImages } from "@/hooks/useSupabaseQuery";
import type { EventImage } from "@/utils/supabase/types";
import EventCard from "@/components/EventCard";
import PageHeader from "@/components/PageHeader";

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();
  const { data: images = [] } = useEventImages();

  const imagesByEvent = useMemo(() => {
    const map = new Map<string, EventImage[]>();
    for (const img of images) {
      const existing = map.get(img.event_id);
      if (existing) {
        existing.push(img);
      } else {
        map.set(img.event_id, [img]);
      }
    }
    return map;
  }, [images]);

  if (isLoading) {
    return (
      <div className="py-6">
        <PageHeader title="Event" color="indigo" icon="📅" />
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
        <PageHeader title="Event" color="indigo" icon="📅" />
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">Belum ada event</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <PageHeader title="Event" color="indigo" icon="📅" />
      <div className="px-4 sm:px-6 pb-6">
        <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
          {events.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              images={imagesByEvent.get(evt.id) ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
