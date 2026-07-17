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
  created_at: string;
}

export interface DestinationImage {
  id: string;
  destination_id: string;
  image_url: string;
  is_hero: boolean;
  image_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  destination_id: string;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
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
}

export interface EventImage {
  id: string;
  event_id: string;
  image_url: string;
  is_hero: boolean;
  image_order: number;
  created_at: string;
}
