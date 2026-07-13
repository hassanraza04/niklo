import { getDb } from "./db";
import type { Coordinates } from "./geo";
import type { Venue } from "./types";

// default sort: most-rated first (popularity), so established venues lead instead of
// a tiny place with a perfect score from a handful of reviews. rating breaks ties.
const ORDER = "order by review_count desc nulls last, rating desc nulls last, name";

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const db = await getDb();
  return (await db
    .prepare(`select * from venues where slug = ?`)
    .bind(slug)
    .first<Venue>()) ?? null;
}

// membership is many-to-many: match the slug as a whole token inside the csv so a
// multi-sport venue (subcategories = 'tennis,swimming') shows on both browse pages.
export async function listVenuesBySubcategory(subSlug: string): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select * from venues where instr(',' || subcategories || ',', ?) > 0 ${ORDER}`)
    .bind(`,${subSlug},`)
    .all<Venue>();
  return results ?? [];
}

export async function listVenuesByCategory(catSlug: string): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select * from venues where instr(',' || category_slugs || ',', ?) > 0 ${ORDER}`)
    .bind(`,${catSlug},`)
    .all<Venue>();
  return results ?? [];
}

export async function topVenues(limit = 8): Promise<Venue[]> {
  const db = await getDb();
  // Crowd favourites reflects popularity. Rating breaks ties between venues with
  // the same amount of public feedback.
  const { results } = await db
    .prepare(
      `select * from venues where review_count is not null
       order by review_count desc nulls last, rating desc nulls last, name limit ?`,
    )
    .bind(limit)
    .all<Venue>();
  return results ?? [];
}

// counts follow membership: a venue is tallied in every category it belongs to.
function tallyCsv(rows: { csv: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    for (const s of (r.csv ?? "").split(",").filter(Boolean)) {
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }
  return counts;
}

export async function countsBySubcategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select subcategories as csv from venues`)
    .all<{ csv: string | null }>();
  return tallyCsv(results ?? []);
}

export async function countsByCategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select category_slugs as csv from venues`)
    .all<{ csv: string | null }>();
  return tallyCsv(results ?? []);
}

export async function spinPool(
  subSlug: string | null = null,
  limit = 12,
): Promise<{ name: string; slug: string; area: string | null; address: string | null }[]> {
  const db = await getDb();
  const where = subSlug
    ? "where instr(',' || subcategories || ',', ?) > 0 and rating is not null"
    : "where rating is not null";
  const binds: (string | number)[] = subSlug ? [`,${subSlug},`, limit] : [limit];
  const { results } = await db
    .prepare(`select name, slug, area, address from venues ${where} order by random() limit ?`)
    .bind(...binds)
    .all<{ name: string; slug: string; area: string | null; address: string | null }>();
  return results ?? [];
}

export async function listAllVenues(): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db.prepare(`select * from venues ${ORDER}`).all<Venue>();
  return results ?? [];
}

export async function listVenueCoordinates(): Promise<Record<string, Coordinates>> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select slug, latitude, longitude from venues where latitude is not null and longitude is not null`)
    .all<{ slug: string; latitude: number; longitude: number }>();
  return Object.fromEntries(
    (results ?? []).map((venue) => [
      venue.slug,
      { latitude: venue.latitude, longitude: venue.longitude },
    ]),
  );
}

export async function listFinderVenues(): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `select venue_id, name, slug, subcategory_slug, subcategory_name, category_slug,
              category_name, subcategories, category_slugs, google_category, rating,
              review_count, latitude, longitude, area, address, city, price_level,
              website, phone, hours, photo_url, null as photos, google_url, status,
              is_open, source_query, last_verified
       from venues
       where rating is not null
       order by rating desc nulls last, review_count desc nulls last, name`,
    )
    .all<Venue>();
  return results ?? [];
}

export async function getVenuesBySlugs(slugs: string[]): Promise<Venue[]> {
  if (!slugs.length) return [];
  const db = await getDb();
  const ph = slugs.map(() => "?").join(",");
  const { results } = await db
    .prepare(`select * from venues where slug in (${ph})`)
    .bind(...slugs)
    .all<Venue>();
  const bySlug = new Map((results ?? []).map((v) => [v.slug, v]));
  return slugs.map((s) => bySlug.get(s)).filter((v): v is Venue => !!v);
}

export async function allVenueSlugs(): Promise<string[]> {
  const db = await getDb();
  const { results } = await db.prepare(`select slug from venues`).all<{ slug: string }>();
  return (results ?? []).map((r) => r.slug);
}
