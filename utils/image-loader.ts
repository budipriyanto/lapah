import type { ImageLoaderProps } from "next/image";

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (src.startsWith("/api/nc-image")) {
    const url = new URL(src, "https://local.invalid");
    if (width) url.searchParams.set("w", String(width));
    return `${url.pathname}?${url.searchParams.toString()}`;
  }

  if (src.includes("lampungtimurkab.go.id")) {
    const params = new URLSearchParams({ url: src });
    if (width) params.set("w", String(width));
    return `/api/image-proxy?${params}`;
  }

  return src;
}
