import { getDb } from "./db";
import type { Venue } from "./types";

const ORDER = "order by rating desc nulls last, review_count desc nulls last, name";

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const db = await getDb();
  return (await db
    .prepare(`select * from venues where slug = ?`)
    .bind(slug)
    .first<Venue>()) ?? null;
}

export async function listVenuesBySubcategory(subSlug: string): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select * from venues where subcategory_slug = ? ${ORDER}`)
    .bind(subSlug)
    .all<Venue>();
  return results ?? [];
}

export async function listVenuesByCategory(catSlug: string): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select * from venues where category_slug = ? ${ORDER}`)
    .bind(catSlug)
    .all<Venue>();
  return results ?? [];
}

export async function topVenues(limit = 8): Promise<Venue[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `select * from venues where rating is not null and review_count >= 20 ${ORDER} limit ?`,
    )
    .bind(limit)
    .all<Venue>();
  return results ?? [];
}

export async function countsBySubcategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select subcategory_slug, count(*) as n from venues group by subcategory_slug`)
    .all<{ subcategory_slug: string; n: number }>();
  return Object.fromEntries((results ?? []).map((r) => [r.subcategory_slug, r.n]));
}

export async function countsByCategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const { results } = await db
    .prepare(`select category_slug, count(*) as n from venues group by category_slug`)
    .all<{ category_slug: string; n: number }>();
  return Object.fromEntries((results ?? []).map((r) => [r.category_slug, r.n]));
}

export async function searchVenues(q: string, limit = 60): Promise<Venue[]> {
  const cleaned = q.trim().replace(/[%_]/g, " ");
  if (!cleaned) return [];
  const like = `%${cleaned}%`;
  const db = await getDb();
  const { results } = await db
    .prepare(
      `select * from venues
       where name like ?1 or area like ?1 or address like ?1
          or subcategory_name like ?1 or category_name like ?1
       ${ORDER} limit ?2`,
    )
    .bind(like, limit)
    .all<Venue>();
  return results ?? [];
}

export async function spinPool(
  subSlug = "padel",
  limit = 12,
): Promise<{ name: string; slug: string; area: string | null; address: string | null }[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `select name, slug, area, address from venues
       where subcategory_slug = ? and rating is not null
       order by random() limit ?`,
    )
    .bind(subSlug, limit)
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

export async function allVenueSlugs(): Promise<string[]> {
  const db = await getDb();
  const { results } = await db.prepare(`select slug from venues`).all<{ slug: string }>();
  return (results ?? []).map((r) => r.slug);
}
