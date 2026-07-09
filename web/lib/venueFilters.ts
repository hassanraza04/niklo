import type { Coordinates } from "./geo.ts";
import { venueDistanceKm } from "./geo.ts";
import { canonicalArea } from "./areas.ts";
import { isOpenNow, opensLate } from "./hours.ts";
import type { Venue } from "./types.ts";

export type VenueMood = "any" | "active" | "chill" | "family" | "indoor" | "outdoor" | "late";

export type VenueFilters = {
  area?: string;
  openNow?: boolean;
  minRating?: number;
  mood?: VenueMood;
  maxDistanceKm?: number;
};

const ACTIVE = new Set([
  "padel",
  "box-cricket",
  "futsal",
  "tennis",
  "squash",
  "swimming",
  "bowling",
  "karting",
  "trampoline",
  "skating",
  "paintball",
]);

const CHILL = new Set([
  "creative-chill",
  "pottery-art",
  "board-game-paint-cafe",
  "music-rooms",
  "cooking-classes",
  "shisha",
  "museums-galleries",
  "heritage",
]);

const FAMILY = new Set([
  "parks",
  "beaches",
  "cinemas",
  "arcades",
  "bowling",
  "mini-golf",
  "theme-parks",
  "museums-galleries",
]);

const INDOOR = new Set([
  "cinemas",
  "arcades",
  "escape-rooms",
  "vr",
  "laser-tag",
  "billiards",
  "bowling",
  "mini-golf",
  "pottery-art",
  "board-game-paint-cafe",
  "music-rooms",
  "cooking-classes",
  "shisha",
  "museums-galleries",
]);

const OUTDOOR = new Set([
  "parks",
  "beaches",
  "boating",
  "adventure-parks",
  "theme-parks",
  "tennis",
  "karting",
]);

function tokens(venue: Venue): Set<string> {
  return new Set(
    [
      venue.subcategory_slug,
      venue.category_slug,
      ...(venue.subcategories ?? "").split(","),
      ...(venue.category_slugs ?? "").split(","),
    ]
      .map((token) => token?.trim())
      .filter((token): token is string => !!token),
  );
}

function hasAny(venue: Venue, values: Set<string>): boolean {
  for (const token of tokens(venue)) {
    if (values.has(token)) return true;
  }
  return false;
}

function googleCategory(venue: Venue): string {
  return (venue.google_category ?? "").toLowerCase();
}

export function venueArea(venue: Pick<Venue, "area" | "address">): string | null {
  return canonicalArea(venue);
}

export function moodMatchesVenue(venue: Venue, mood: VenueMood): boolean {
  if (mood === "any") return true;
  if (mood === "active") return hasAny(venue, ACTIVE);
  if (mood === "chill") return hasAny(venue, CHILL);
  if (mood === "family") {
    return hasAny(venue, FAMILY) || /(park|museum|cinema|amusement|bowling)/.test(googleCategory(venue));
  }
  if (mood === "indoor") {
    return hasAny(venue, INDOOR) || /(cinema|museum|mall|cafe|restaurant|club|indoor)/.test(googleCategory(venue));
  }
  if (mood === "outdoor") {
    return hasAny(venue, OUTDOOR) || /(park|beach|garden|outdoor|playground)/.test(googleCategory(venue));
  }
  return opensLate(venue.hours);
}

export function filterVenuesForDisplay<T extends Venue>(
  venues: T[],
  filters: VenueFilters,
  location: Coordinates | null,
): T[] {
  return venues.filter((venue) => {
    if (filters.area && venueArea(venue) !== filters.area) return false;
    if (filters.openNow && isOpenNow(venue.hours) !== true) return false;
    if (filters.minRating && (venue.rating ?? 0) < filters.minRating) return false;
    if (filters.mood && !moodMatchesVenue(venue, filters.mood)) return false;
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

export function tonightPicks<T extends Venue>(
  venues: T[],
  filters: VenueFilters,
  location: Coordinates | null,
  limit = 5,
): T[] {
  return filterVenuesForDisplay(venues, filters, location)
    .sort((a, b) => {
      const byScore = qualityScore(b) - qualityScore(a);
      if (byScore !== 0) return byScore;
      return (b.review_count ?? 0) - (a.review_count ?? 0);
    })
    .slice(0, limit);
}
