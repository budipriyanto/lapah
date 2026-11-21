export interface Destination {
  id: string;
  title: string;
  slug: string;
  category: "wisata" | "kuliner" | "penginapan";
  subcategory: string | null;
  description: string | null;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_range: string | null;
  opening_hours: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  rating_avg: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  source_id: string | null;
}

export interface DestinationImage {
  id: string;
  destination_id: string;
  image_url: string;
  image_size: number | null;
  is_hero: boolean;
  image_order: number;
  source_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  destination_id: string;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  role: "user" | "admin";
  full_name: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  location: string | null;
  description: string | null;
  date_start: string;
  date_end: string | null;
  time: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  source_id: string | null;
}

export interface EventImage {
  id: string;
  event_id: string;
  image_url: string;
  image_size: number | null;
  is_hero: boolean;
  image_order: number;
  source_id: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  remote_url: string;
  nextcloud_file: string;
  filename: string | null;
  mime: string | null;
  size: number | null;
  checksum: string | null;
  source_type: string | null;
  source_slug: string | null;
  source_label: string | null;
  is_hero_source: boolean;
  source_order: number;
  created_at: string;
}

export interface SyncRun {
  id: string;
  mode: string;
  status: "running" | "completed" | "failed";
  summary: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}
