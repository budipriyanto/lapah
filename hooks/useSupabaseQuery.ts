"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { Destination, DestinationImage, Review, Event, EventImage } from "@/utils/supabase/types";

const supabase = createClient();

function queryKey(prefix: string, ...args: (string | number | undefined)[]) {
  return [prefix, ...args.filter((a) => a !== undefined)];
}

export function useDestinations() {
  return useQuery({
    queryKey: queryKey("destinations"),
    queryFn: async () => {
      const { data } = await supabase.from("destinations").select("*").order("title");
      return (data ?? []) as Destination[];
    },
  });
}

export function useDestinationImages() {
  return useQuery({
    queryKey: queryKey("destination_images"),
    queryFn: async () => {
      const { data } = await supabase.from("destination_images").select("*").order("image_order");
      return (data ?? []) as DestinationImage[];
    },
  });
}

export function useDestinationsByCategory(category: string, limit = 100) {
  return useQuery({
    queryKey: queryKey("destinations", "category", category, String(limit)),
    queryFn: async () => {
      const { data } = await supabase
        .from("destinations")
        .select("*")
        .eq("category", category)
        .order("title")
        .limit(limit);
      return (data ?? []) as Destination[];
    },
  });
}

export function useDestinationById(id: string) {
  return useQuery({
    queryKey: queryKey("destinations", id),
    queryFn: async () => {
      const { data } = await supabase.from("destinations").select("*").eq("id", id).single();
      return data as Destination | null;
    },
  });
}

export function useReviewsByDestinationId(destinationId: string) {
  return useQuery({
    queryKey: queryKey("reviews", destinationId),
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("destination_id", destinationId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Review[];
    },
  });
}

export function useDestinationImagesByDestinationId(destinationId: string) {
  return useQuery({
    queryKey: queryKey("destination_images", destinationId),
    queryFn: async () => {
      const { data } = await supabase
        .from("destination_images")
        .select("*")
        .eq("destination_id", destinationId)
        .order("image_order");
      return (data ?? []) as DestinationImage[];
    },
  });
}

export function useAllData() {
  return useQuery({
    queryKey: queryKey("all_data"),
    queryFn: async () => {
      const [destResult, imgResult, evtResult, evtImgResult] = await Promise.all([
        supabase.from("destinations").select("*").order("title"),
        supabase.from("destination_images").select("*").order("image_order"),
        supabase.from("events").select("*").order("date_start", { ascending: false }),
        supabase.from("event_images").select("*").order("image_order"),
      ]);
      return {
        destinations: (destResult.data ?? []) as Destination[],
        images: (imgResult.data ?? []) as DestinationImage[],
        events: (evtResult.data ?? []) as Event[],
        eventImages: (evtImgResult.data ?? []) as EventImage[],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Events ───────────────────────────────────────────

export function useEvents() {
  return useQuery({
    queryKey: queryKey("events"),
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("date_start", { ascending: false });
      return (data ?? []) as Event[];
    },
  });
}

export function useEventById(id: string) {
  return useQuery({
    queryKey: queryKey("events", id),
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      return data as Event | null;
    },
  });
}

export function useEventImages() {
  return useQuery({
    queryKey: queryKey("event_images"),
    queryFn: async () => {
      const { data } = await supabase.from("event_images").select("*").order("image_order");
      return (data ?? []) as EventImage[];
    },
  });
}

export function useEventImagesByEventId(eventId: string) {
  return useQuery({
    queryKey: queryKey("event_images", eventId),
    queryFn: async () => {
      const { data } = await supabase
        .from("event_images")
        .select("*")
        .eq("event_id", eventId)
        .order("image_order");
      return (data ?? []) as EventImage[];
    },
  });
}

export function useAllEventsData() {
  return useQuery({
    queryKey: queryKey("all_events_data"),
    queryFn: async () => {
      const [evtResult, imgResult] = await Promise.all([
        supabase.from("events").select("*").order("date_start", { ascending: false }),
        supabase.from("event_images").select("*").order("image_order"),
      ]);
      return {
        events: (evtResult.data ?? []) as Event[],
        images: (imgResult.data ?? []) as EventImage[],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}
