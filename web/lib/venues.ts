import { getDb } from "./db";
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
// multi-sport venue (subcategories = 'padel,futsal') shows on both browse pages.
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
  // "crowd favourites" is explicitly highest-rated (among venues with enough reviews),
  // so it keeps a rating-first sort regardless of the default browse order.
  const { results } = await db
    .prepare(
      `select * from venues where rating is not null and review_count >= 20
       order by rating desc nulls last, review_count desc nulls last, name limit ?`,
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

export async function searchVenues(q: string, limit = 60): Promise<Venue[]> {
  // Tokenize so "padel clifton" still works as an activity-plus-location search.
  // The whole phrase is also ranked separately below, which keeps the actual venue
  // ahead of unrelated high-review results that happen to share one token.
  const tokens = q
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[%_]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  if (!tokens.length) return [];
  const phrase = tokens.join(" ").toLowerCase();

  const db = await getDb();
  // Include memberships so "futsal" also finds a padel-primary venue that offers
  // futsal. Address-only matches are a fallback, keeping a busy address from
  // overwhelming a venue-name search.
  const strongFields = ["name", "area", "subcategory_name", "category_name", "subcategories"];
  const exactName = phrase;
  const namePrefix = `${phrase}%`;
  const phraseMatch = `%${phrase}%`;
  const exactSubcategory = phrase;
  const exactCategory = phrase;
  const exactArea = phrase;

  async function runSearch(includeAddress: boolean): Promise<Venue[]> {
    const fields = includeAddress ? [...strongFields, "address"] : strongFields;
    const clause = tokens
      .map(() => `(${fields.map((field) => `${field} like ?`).join(" or ")})`)
      .join(" and ");
    const binds: (string | number)[] = [];
    for (const t of tokens) {
      const like = `%${t}%`;
      binds.push(...fields.map(() => like));
    }
    binds.push(
      exactName,
      namePrefix,
      phraseMatch,
      exactSubcategory,
      exactCategory,
      exactArea,
      phraseMatch,
      limit,
    );

    const { results } = await db
      .prepare(
        `select * from venues
         where ${clause}
         order by case
           when lower(name) = ? then 0
           when lower(name) like ? then 1
           when lower(name) like ? then 2
           when lower(subcategory_name) = ? then 3
           when lower(category_name) = ? then 4
           when lower(area) = ? then 5
           when lower(address) like ? then 7
           else 6
         end,
         review_count desc nulls last, rating desc nulls last, name
         limit ?`,
      )
      .bind(...binds)
      .all<Venue>();
    return results ?? [];
  }

  const strongResults = await runSearch(false);
  return strongResults.length ? strongResults : runSearch(true);
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

export async function listFlagged(): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `select * from venues where review_level is not null
       order by case review_level when 'high' then 0 else 1 end,
                review_count desc nulls last, name`,
    )
    .all<Venue>();
  return results ?? [];
}

export async function listAllVenues(): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db.prepare(`select * from venues ${ORDER}`).all<Venue>();
  return results ?? [];
}

export async function listFinderVenues(limit = 160): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `select venue_id, name, slug, subcategory_slug, subcategory_name, category_slug,
              category_name, subcategories, category_slugs, google_category, rating,
              review_count, latitude, longitude, area, address, city, price_level,
              website, phone, hours, photo_url, null as photos, google_url, status,
              is_open, source_query, last_verified, review_level, review_flag
       from venues
       where rating is not null
       order by rating desc nulls last, review_count desc nulls last, name
       limit ?`,
    )
    .bind(limit)
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
