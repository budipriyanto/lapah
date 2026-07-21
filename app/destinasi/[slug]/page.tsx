import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DetailClient from "./DetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dest } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!dest) return { title: "Destinasi tidak ditemukan" };

  const { data: imgs } = await supabase
    .from("destination_images")
    .select("image_url")
    .eq("destination_id", dest.id)
    .eq("is_hero", true)
    .limit(1);

  const ogImage = (imgs as { image_url: string }[] | null)?.[0]?.image_url;
  const title = dest.title;
  const description = dest.description?.slice(0, 160) ?? `Destinasi ${dest.category} di Lampung Timur`;

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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dest } = await supabase
    .from("destinations")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!dest) notFound();

  return <DetailClient id={dest.id} />;
}
