import rawCatalog from "../data/catalog.json" with { type: "json" };
import type { Venue } from "./types";

export const catalog = rawCatalog as readonly Venue[];

function csvValues(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function popularityOrder(a: Venue, b: Venue): number {
  const reviews = (b.review_count ?? -Infinity) - (a.review_count ?? -Infinity);
  if (reviews) return reviews;

  const ratings = (b.rating ?? -Infinity) - (a.rating ?? -Infinity);
  if (ratings) return ratings;

  return a.name.localeCompare(b.name);
}

export function getCatalogVenue(slug: string, venues: readonly Venue[] = catalog): Venue | null {
  return venues.find((venue) => venue.slug === slug) ?? null;
}

export function catalogByCategory(slug: string, venues: readonly Venue[] = catalog): Venue[] {
  return venues
    .filter((venue) => csvValues(venue.category_slugs ?? venue.category_slug).includes(slug))
    .sort(popularityOrder);
}

export function catalogBySubcategory(slug: string, venues: readonly Venue[] = catalog): Venue[] {
  return venues
    .filter((venue) => csvValues(venue.subcategories ?? venue.subcategory_slug).includes(slug))
    .sort(popularityOrder);
}

function catalogCounts(field: "category_slugs" | "subcategories", venues: readonly Venue[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const venue of venues) {
    for (const value of csvValues(venue[field])) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

export function catalogCountsByCategory(venues: readonly Venue[] = catalog): Record<string, number> {
  return catalogCounts("category_slugs", venues);
}

export function catalogCountsBySubcategory(venues: readonly Venue[] = catalog): Record<string, number> {
  return catalogCounts("subcategories", venues);
}

export function catalogTopVenues(limit = 8, venues: readonly Venue[] = catalog): Venue[] {
  return [...venues].filter((venue) => venue.review_count != null).sort(popularityOrder).slice(0, limit);
}

export const catalogSlugs = catalog.map((venue) => venue.slug);

export function catalogBySlugs(slugs: readonly string[], venues: readonly Venue[] = catalog): Venue[] {
  const bySlug = new Map(venues.map((venue) => [venue.slug, venue]));
  return slugs.map((slug) => bySlug.get(slug)).filter((venue): venue is Venue => venue != null);
}
