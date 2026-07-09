import type { Coordinates } from "./geo";

export const LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StoredLocation = Coordinates & { savedAt: number };

export type ParsedStoredLocation = {
  location: Coordinates | null;
  savedAt: number | null;
  expired: boolean;
};

export function serializeStoredLocation(
  location: Coordinates,
  savedAt = Date.now(),
): string {
  return JSON.stringify({ ...location, savedAt } satisfies StoredLocation);
}

export function parseStoredLocation(
  raw: string | null,
  now = Date.now(),
): ParsedStoredLocation {
  if (!raw) return { location: null, savedAt: null, expired: false };

  try {
    const parsed = JSON.parse(raw) as StoredLocation | null;
    if (
      parsed &&
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number" &&
      typeof parsed.savedAt === "number"
    ) {
      if (now - parsed.savedAt > LOCATION_MAX_AGE_MS) {
        return { location: null, savedAt: null, expired: true };
      }
      return {
        location: { latitude: parsed.latitude, longitude: parsed.longitude },
        savedAt: parsed.savedAt,
        expired: false,
      };
    }
  } catch {
    return { location: null, savedAt: null, expired: false };
  }

  return { location: null, savedAt: null, expired: false };
}
