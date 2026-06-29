export type Venue = {
  venue_id: string;
  name: string;
  slug: string;
  subcategory_slug: string;
  subcategory_name: string | null;
  category_slug: string | null;
  category_name: string | null;
  subcategories: string | null; // csv of subcategory slugs, primary first
  category_slugs: string | null; // csv of parent category slugs
  google_category: string | null;
  rating: number | null;
  review_count: number | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  address: string | null;
  city: string | null;
  price_level: string | null;
  website: string | null;
  phone: string | null;
  hours: string | null; // json: { Monday: ["7 AM-11 PM"], ... }
  photo_url: string | null;
  photos: string | null; // json: [{ title, image }]
  google_url: string | null;
  status: string | null;
  is_open: number | null;
  source_query: string | null;
  last_verified: string | null;
  review_level: "high" | "check" | null; // manual curation flag
  review_flag: string | null; // why it was flagged
};

export type OpenHours = Record<string, string[]>;

export function parseHours(raw: string | null): OpenHours | null {
  if (!raw) return null;
  try {
    const h = JSON.parse(raw) as OpenHours;
    return h && Object.keys(h).length ? h : null;
  } catch {
    return null;
  }
}

export function parsePhotos(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Array<{ image?: string }>;
    return arr.map((p) => p.image).filter((u): u is string => !!u);
  } catch {
    return [];
  }
}
