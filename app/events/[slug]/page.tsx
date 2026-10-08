import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dbQueryOne } from "@/utils/db";
import EventDetailClient from "./EventDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string) {
  return dbQueryOne<{ id: string; title: string; description: string | null; location: string | null }>(
    "SELECT id, title, description, location FROM events WHERE slug = ? OR id = ?",
    [slug, slug]
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const evt = await getEvent(slug);

  if (!evt) return { title: "Event tidak ditemukan" };

  const img = await dbQueryOne<{ image_url: string }>(
    "SELECT image_url FROM event_images WHERE event_id = ? AND is_hero = true LIMIT 1",
    [evt.id]
  );
  const ogImage = img?.image_url;
  const title = evt.title;
  const baseDesc = evt.description ?? "Event di Lampung Timur";
  const description = (
    evt.location ? `📍 ${evt.location}\n${baseDesc}` : baseDesc
  ).slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage
        ? [{ url: ogImage, width: 640, height: 480, alt: title }]
        : [{ url: "/icon-512.png", width: 512, height: 512, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : ["/icon-512.png"],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const evt = await getEvent(slug);

  if (!evt) notFound();

  return <EventDetailClient id={evt.id} />;
}
