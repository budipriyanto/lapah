import { existsSync } from "fs";
import path from "path";

/**
 * Buang entri gambar lokal yang filanya tidak ada di /public
 * agar client tidak pernah melakukan request 404.
 * URL remote (http/https) diteruskan apa adanya.
 */
export function filterExistingImages<T extends { image_url: string }>(
  images: T[]
): T[] {
  return images.filter((img) => {
    const url = img.image_url;
    if (!url) return false;
    if (/^https?:\/\//i.test(url)) return true;
    const clean = url.split(/[?#]/)[0];
    if (!clean.startsWith("/")) return true;
    try {
      return existsSync(
        path.join(process.cwd(), "public", decodeURIComponent(clean))
      );
    } catch {
      return false;
    }
  });
}

export interface NormalizedImage {
  image_url: string;
  is_hero: boolean;
  image_order: number;
}

/**
 * Normalisasi array gambar dari body request admin.
 * Menerima properti `image_url` atau `url`, buang entri kosong/terlalu panjang,
 * reindex urutan berdasarkan posisi, dan jaga tepat satu hero (baris pertama).
 */
export function normalizeImages(incoming: unknown): NormalizedImage[] {
  if (!Array.isArray(incoming)) return [];

  const rows: NormalizedImage[] = [];
  for (const item of incoming) {
    if (!item || typeof item !== "object") continue;
    const img = item as { image_url?: unknown; url?: unknown; is_hero?: unknown };
    const raw =
      typeof img.image_url === "string"
        ? img.image_url
        : typeof img.url === "string"
          ? img.url
          : "";
    const url = raw.trim();
    if (!url || url.length > 500) continue;
    rows.push({
      image_url: url,
      is_hero: img.is_hero === true || img.is_hero === 1,
      image_order: rows.length,
    });
  }

  if (rows.length > 0) {
    let heroIndex = rows.findIndex((r) => r.is_hero);
    if (heroIndex === -1) heroIndex = 0;
    rows.forEach((r, i) => {
      r.is_hero = i === heroIndex;
    });
  }

  return rows;
}
