export type SortMode = "popularity" | "rating" | "nearest";
export type SortDirection = "asc" | "desc";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type SortableVenue = {
  review_count: number | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
};

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const earthKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function venueDistanceKm(
  venue: SortableVenue,
  location: Coordinates | null,
): number | null {
  if (
    !location ||
    venue.latitude == null ||
    venue.longitude == null ||
    Number.isNaN(venue.latitude) ||
    Number.isNaN(venue.longitude)
  ) {
    return null;
  }
  return distanceKm(location, {
    latitude: venue.latitude,
    longitude: venue.longitude,
  });
}

function numberValue(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : -1;
}

function compareNumbers(a: number, b: number, direction: SortDirection): number {
  return direction === "asc" ? a - b : b - a;
}

export function sortVenuesForDisplay<T extends SortableVenue>(
  venues: T[],
  mode: SortMode,
  direction: SortDirection,
  location: Coordinates | null,
): T[] {
  return [...venues].sort((a, b) => {
    if (mode === "nearest") {
      const da = venueDistanceKm(a, location);
      const db = venueDistanceKm(b, location);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return compareNumbers(da, db, direction);
    }

    if (mode === "rating") {
      const byRating = compareNumbers(numberValue(a.rating), numberValue(b.rating), direction);
      if (byRating !== 0) return byRating;
      return compareNumbers(numberValue(a.review_count), numberValue(b.review_count), "desc");
    }

    const byReviews = compareNumbers(
      numberValue(a.review_count),
      numberValue(b.review_count),
      direction,
    );
    if (byReviews !== 0) return byReviews;
    return compareNumbers(numberValue(a.rating), numberValue(b.rating), "desc");
  });
}

