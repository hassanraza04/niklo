import type { Coordinates } from "./geo";

export const KARACHI_MAP_CENTER: [number, number] = [24.8607, 67.0011];

export const MAP_TILE_PROVIDER = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export type MapVenue = {
  slug: string;
  name: string;
  category_slug: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  category_slugs: string | null;
  latitude: number;
  longitude: number;
  area: string | null;
  rating: number | null;
  review_count: number | null;
};

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

const KARACHI_BOUNDS: MapBounds = {
  minLat: 24.73,
  maxLat: 25.08,
  minLon: 66.88,
  maxLon: 67.32,
};

function categoryMemberships(venue: Pick<MapVenue, "category_slug" | "category_slugs">) {
  return (venue.category_slugs ?? venue.category_slug ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function primaryCategorySlug(
  venue: Pick<MapVenue, "category_slug" | "category_slugs">,
): string {
  return categoryMemberships(venue)[0] ?? "other";
}

export function filteredMapVenues<T extends MapVenue>(
  venues: T[],
  selectedCategories: Set<string>,
): T[] {
  if (!selectedCategories.size) return [];
  return venues.filter((venue) =>
    categoryMemberships(venue).some((slug) => selectedCategories.has(slug)),
  );
}

export function mapBounds(venues: MapVenue[], userLocation: Coordinates | null): MapBounds {
  const points = [
    ...venues.map((venue) => ({ latitude: venue.latitude, longitude: venue.longitude })),
    ...(userLocation ? [userLocation] : []),
  ];
  if (!points.length) return KARACHI_BOUNDS;

  let minLat = Math.min(...points.map((point) => point.latitude));
  let maxLat = Math.max(...points.map((point) => point.latitude));
  let minLon = Math.min(...points.map((point) => point.longitude));
  let maxLon = Math.max(...points.map((point) => point.longitude));

  const latPad = Math.max((maxLat - minLat) * 0.1, 0.006);
  const lonPad = Math.max((maxLon - minLon) * 0.1, 0.006);

  minLat -= latPad;
  maxLat += latPad;
  minLon -= lonPad;
  maxLon += lonPad;

  return { minLat, maxLat, minLon, maxLon };
}

export function mapPointStyle(point: Coordinates, bounds: MapBounds) {
  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;

  return {
    left: ((point.longitude - bounds.minLon) / lonSpan) * 100,
    top: ((bounds.maxLat - point.latitude) / latSpan) * 100,
  };
}
