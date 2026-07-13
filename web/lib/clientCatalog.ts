import type { CatalogCardVenue } from "./types";

let catalogPromise: Promise<readonly CatalogCardVenue[]> | null = null;

export function loadClientCatalog(): Promise<readonly CatalogCardVenue[]> {
  catalogPromise ??= fetch("/catalog-client.json", { cache: "force-cache" }).then(
    (response) => {
      if (!response.ok) throw new Error("Could not load Niklo's catalog.");
      return response.json() as Promise<CatalogCardVenue[]>;
    },
  );
  return catalogPromise;
}

export function clearClientCatalogCache() {
  catalogPromise = null;
}

function queryTokens(rawQuery: string): string[] {
  return rawQuery
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[%_]/g, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
}

function csvValues(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function searchableValues(venue: CatalogCardVenue, includeAddress: boolean): string[] {
  const values = [
    venue.name,
    venue.area,
    venue.category_name,
    venue.category_slug,
    venue.subcategory_name,
    venue.subcategory_slug,
    venue.category_slugs,
    venue.subcategories,
  ];
  if (includeAddress) values.push(venue.address);
  return values.filter((value): value is string => value != null).map((value) => value.toLowerCase());
}

function matchRank(venue: CatalogCardVenue, phrase: string): number {
  const name = venue.name.toLowerCase();
  const subcategories = [
    venue.subcategory_name?.toLowerCase(),
    venue.subcategory_slug?.toLowerCase(),
    ...csvValues(venue.subcategories),
  ];
  const categories = [
    venue.category_name?.toLowerCase(),
    venue.category_slug?.toLowerCase(),
    ...csvValues(venue.category_slugs),
  ];

  if (name === phrase) return 0;
  if (name.startsWith(phrase)) return 1;
  if (name.includes(phrase)) return 2;
  if (subcategories.includes(phrase)) return 3;
  if (categories.includes(phrase)) return 4;
  if (venue.area?.toLowerCase() === phrase) return 5;
  if (venue.address?.toLowerCase().includes(phrase)) return 6;
  return 7;
}

function rankedMatches(
  tokens: readonly string[],
  venues: readonly CatalogCardVenue[],
  includeAddress: boolean,
  limit: number,
): CatalogCardVenue[] {
  const phrase = tokens.join(" ");
  return venues
    .filter((venue) => {
      const fields = searchableValues(venue, includeAddress);
      return tokens.every((token) => fields.some((field) => field.includes(token)));
    })
    .sort((a, b) => {
      const rank = matchRank(a, phrase) - matchRank(b, phrase);
      if (rank) return rank;

      const reviews = (b.review_count ?? -Infinity) - (a.review_count ?? -Infinity);
      if (reviews) return reviews;

      const rating = (b.rating ?? -Infinity) - (a.rating ?? -Infinity);
      if (rating) return rating;

      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(0, limit));
}

export function searchClientCatalog(
  query: string,
  venues: readonly CatalogCardVenue[],
  limit = 60,
): CatalogCardVenue[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];

  const strong = rankedMatches(tokens, venues, false, limit);
  return strong.length ? strong : rankedMatches(tokens, venues, true, limit);
}
