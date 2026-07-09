import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceKm,
  formatDistance,
  sortVenuesForDisplay,
  type SortDirection,
  type SortMode,
} from "./geo.ts";

const clifton = { latitude: 24.8138, longitude: 67.0305 };
const dha = { latitude: 24.8065, longitude: 67.0623 };

const venues = [
  {
    venue_id: "a",
    name: "Popular",
    review_count: 500,
    rating: 4.1,
    latitude: 24.9,
    longitude: 67.1,
  },
  {
    venue_id: "b",
    name: "Rated",
    review_count: 40,
    rating: 4.9,
    latitude: 24.82,
    longitude: 67.03,
  },
  {
    venue_id: "c",
    name: "Nearby",
    review_count: 30,
    rating: 4.2,
    latitude: 24.814,
    longitude: 67.031,
  },
];

function names(mode: SortMode, direction: SortDirection, location = clifton) {
  return sortVenuesForDisplay(venues, mode, direction, location).map((venue) => venue.name);
}

test("distanceKm returns distance rounded by formatter to one decimal km", () => {
  const km = distanceKm(clifton, dha);
  assert.equal(formatDistance(km), "3.3 km");
});

test("sortVenuesForDisplay sorts by popularity in both directions", () => {
  assert.deepEqual(names("popularity", "desc"), ["Popular", "Rated", "Nearby"]);
  assert.deepEqual(names("popularity", "asc"), ["Nearby", "Rated", "Popular"]);
});

test("sortVenuesForDisplay sorts by rating in both directions", () => {
  assert.deepEqual(names("rating", "desc"), ["Rated", "Nearby", "Popular"]);
  assert.deepEqual(names("rating", "asc"), ["Popular", "Nearby", "Rated"]);
});

test("sortVenuesForDisplay sorts by nearest in both directions", () => {
  assert.deepEqual(names("nearest", "asc"), ["Nearby", "Rated", "Popular"]);
  assert.deepEqual(names("nearest", "desc"), ["Popular", "Rated", "Nearby"]);
});

