import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDetailClient from "./EventDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: evt } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!evt) return { title: "Event tidak ditemukan" };

  const { data: imgs } = await supabase
    .from("event_images")
    .select("image_url")
    .eq("event_id", evt.id)
    .eq("is_hero", true)
    .limit(1);

  const ogImage = (imgs as { image_url: string }[] | null)?.[0]?.image_url;
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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: evt } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!evt) notFound();

  return <EventDetailClient id={evt.id} />;
}
