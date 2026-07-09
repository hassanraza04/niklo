import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCATION_MAX_AGE_MS,
  parseStoredLocation,
  serializeStoredLocation,
} from "./locationStorage.ts";

const now = Date.UTC(2026, 6, 10, 12);
const location = { latitude: 24.8138, longitude: 67.0305 };

test("parseStoredLocation keeps a fresh saved location", () => {
  const raw = serializeStoredLocation(location, now - 60_000);

  assert.deepEqual(parseStoredLocation(raw, now), {
    location,
    savedAt: now - 60_000,
    expired: false,
  });
});

test("parseStoredLocation expires a saved location after 24 hours", () => {
  const raw = serializeStoredLocation(location, now - LOCATION_MAX_AGE_MS - 1);

  assert.deepEqual(parseStoredLocation(raw, now), {
    location: null,
    savedAt: null,
    expired: true,
  });
});

test("parseStoredLocation ignores corrupt saved location data", () => {
  assert.deepEqual(parseStoredLocation("{nope", now), {
    location: null,
    savedAt: null,
    expired: false,
  });
});
