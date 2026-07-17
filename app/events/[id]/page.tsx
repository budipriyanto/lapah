import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import EventDetailClient from "./EventDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const [evtRes, imgRes] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("event_images")
      .select("image_url")
      .eq("event_id", id)
      .eq("is_hero", true)
      .limit(1),
  ]);

  const evt = evtRes.data as { title: string; description?: string | null } | null;
  const ogImage = (imgRes.data as { image_url: string }[] | null)?.[0]?.image_url;

  if (!evt) {
    return { title: "Event tidak ditemukan" };
  }

  const title = evt.title;
  const description = evt.description?.slice(0, 160) ?? "Event di Lampung Timur";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage
        ? [{ url: ogImage, width: 640, height: 480, alt: title }]
        : [{ url: "/icon.svg", width: 512, height: 512, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : ["/icon.svg"],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailClient id={id} />;
}
