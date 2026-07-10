export interface Destination {
  id: string;
  title: string;
  category: "wisata" | "kuliner";
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
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
