const DEFAULT_SOURCE_BASE_URL = "https://wisata.lampungtimurkab.go.id";

export const SOURCE_BASE_URL = (
  process.env.ASSET_SOURCE_BASE_URL?.trim() || DEFAULT_SOURCE_BASE_URL
).replace(/\/+$/, "");

export interface SourceImage {
  id: string;
  destination_id?: string;
  event_id?: string;
  image_url: string;
  image_size?: number | null;
  is_hero?: boolean | number | string;
  image_order?: number | string;
  created_at?: string | null;
}

export interface SourceDestination {
  id: string;
  title: string;
  slug: string;
  category: "wisata" | "kuliner" | "penginapan";
  subcategory: string | null;
  description: string | null;
  location: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  price_range: string | null;
  opening_hours: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  rating_avg: string | number | null;
  review_count: number | string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  images?: SourceImage[];
}

export interface SourceEvent {
  id: string;
  title: string;
  slug: string;
  location: string | null;
  description: string | null;
  date_start: string;
  date_end: string | null;
  time: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  images?: SourceImage[];
}

export interface SourceReview {
  id: string;
  destination_id: string;
  user_id: string | null;
  user_name: string;
  rating: number | string;
  comment: string | null;
  is_verified?: boolean | number | string;
  status?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  dest_title?: string | null;
  dest_slug?: string | null;
  real_name?: string | null;
}

async function fetchCollection<T>(path: string): Promise<T[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${SOURCE_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Sumber ${path} merespons ${response.status}`);
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: unknown;
      error?: string;
    };

    if (!payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || `Payload ${path} tidak valid`);
    }

    return payload.data as T[];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timeout saat mengambil ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchSourceDestinations() {
  return fetchCollection<SourceDestination>("/api/destinations");
}

export function fetchSourceEvents() {
  return fetchCollection<SourceEvent>("/api/events");
}

export function fetchSourceReviews() {
  return fetchCollection<SourceReview>("/api/reviews");
}

export function resolveSourceImageUrl(imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SOURCE_BASE_URL}/${imageUrl.replace(/^\/+/, "")}`;
}

export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > 0 ? text : null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toInteger(value: unknown, fallback = 0): number {
  const number = toNumberOrNull(value);
  return number === null ? fallback : Math.trunc(number);
}

export function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function toDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    return `${text.replace(" ", "T")}+07:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T00:00:00+07:00`;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeSourceImages(images: unknown): SourceImage[] {
  if (!Array.isArray(images)) return [];

  return images.filter((item): item is SourceImage => {
    if (!item || typeof item !== "object") return false;
    const image = item as Partial<SourceImage>;
    return typeof image.id === "string" && typeof image.image_url === "string" && image.image_url.length > 0;
  });
}
