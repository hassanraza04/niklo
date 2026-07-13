import type { Coordinates } from "./geo.ts";
import { venueDistanceKm } from "./geo.ts";
import { isOpenNow } from "./hours.ts";
import type { Venue } from "./types.ts";

export type VenueFilters = {
  openNow?: boolean;
  minRating?: number;
  maxDistanceKm?: number;
};

export function filterVenuesForDisplay<T extends Venue>(
  venues: T[],
  filters: VenueFilters,
  location: Coordinates | null,
): T[] {
  return venues.filter((venue) => {
    if (filters.openNow && isOpenNow(venue.hours) !== true) return false;
    if (filters.minRating && (venue.rating ?? 0) < filters.minRating) return false;
    if (filters.maxDistanceKm) {
      const distance = venueDistanceKm(venue, location);
      if (distance == null || distance > filters.maxDistanceKm) return false;
    }
    return true;
  });
}

function qualityScore(venue: Venue): number {
  const rating = venue.rating ?? 0;
  const reviews = Math.log((venue.review_count ?? 0) + 1);
  return rating * 20 + reviews * 4;
}

function rankedTonightMatches<T extends Venue>(
  venues: T[],
  filters: VenueFilters,
  location: Coordinates | null,
): T[] {
  return filterVenuesForDisplay(venues, filters, location)
    .sort((a, b) => {
      const byScore = qualityScore(b) - qualityScore(a);
      if (byScore !== 0) return byScore;
      return (b.review_count ?? 0) - (a.review_count ?? 0);
    });
}

export function tonightPicks<T extends Venue>(
  venues: T[],
  filters: VenueFilters,
  location: Coordinates | null,
  limit = 5,
): T[] {
  return rankedTonightMatches(venues, filters, location).slice(0, limit);
}

export function tonightPickPage<T extends Venue>(
  venues: T[],
  filters: VenueFilters,
  location: Coordinates | null,
  page: number,
  pageSize = 5,
) {
  const matches = rankedTonightMatches(venues, filters, location);
  const pageCount = Math.ceil(matches.length / pageSize);
  const currentPage = pageCount === 0 ? 0 : Math.min(Math.max(page, 0), pageCount - 1);
  const start = currentPage * pageSize;

  return {
    currentPage,
    pageCount,
    picks: matches.slice(start, start + pageSize),
    totalMatches: matches.length,
  };
}
