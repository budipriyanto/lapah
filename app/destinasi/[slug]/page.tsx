import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dbQueryOne } from "@/utils/db";
import DetailClient from "./DetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDestination(slug: string) {
  return dbQueryOne<{ id: string; title: string; description: string | null; category: string; address: string | null }>(
    "SELECT id, title, description, category, address FROM destinations WHERE slug = ? OR id = ?",
    [slug, slug]
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dest = await getDestination(slug);

  if (!dest) return { title: "Destinasi tidak ditemukan" };

  const img = await dbQueryOne<{ image_url: string }>(
    "SELECT image_url FROM destination_images WHERE destination_id = ? AND is_hero = true LIMIT 1",
    [dest.id]
  );
  const ogImage = img?.image_url;
  const title = dest.title;
  const baseDesc = dest.description ?? `Destinasi ${dest.category} di Lampung Timur`;
  const description = (
    dest.address ? `📍 ${dest.address}\n${baseDesc}` : baseDesc
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
  const dest = await getDestination(slug);

  if (!dest) notFound();

  return <DetailClient id={dest.id} />;
}
