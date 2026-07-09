import test from "node:test";
import assert from "node:assert/strict";
import { filterVenuesForDisplay, moodMatchesVenue, tonightPicks } from "./venueFilters.ts";
import type { Venue } from "./types.ts";

function venue(overrides: Partial<Venue>): Venue {
  return {
    venue_id: overrides.venue_id ?? overrides.slug ?? "venue",
    name: overrides.name ?? "Venue",
    slug: overrides.slug ?? "venue",
    subcategory_slug: overrides.subcategory_slug ?? "padel",
    subcategory_name: overrides.subcategory_name ?? "Padel",
    category_slug: overrides.category_slug ?? "sports-active",
    category_name: overrides.category_name ?? "Sports & Active",
    subcategories: overrides.subcategories ?? overrides.subcategory_slug ?? "padel",
    category_slugs: overrides.category_slugs ?? overrides.category_slug ?? "sports-active",
    google_category: overrides.google_category ?? null,
    rating: overrides.rating ?? 4.5,
    review_count: overrides.review_count ?? 20,
    latitude: overrides.latitude ?? 24.8138,
    longitude: overrides.longitude ?? 67.0305,
    area: overrides.area ?? "Clifton",
    address: overrides.address ?? "Clifton, Karachi",
    city: overrides.city ?? "Karachi",
    price_level: overrides.price_level ?? null,
    website: overrides.website ?? null,
    phone: overrides.phone ?? null,
    hours: overrides.hours ?? null,
    photo_url: overrides.photo_url ?? null,
    photos: overrides.photos ?? null,
    google_url: overrides.google_url ?? null,
    status: overrides.status ?? null,
    is_open: overrides.is_open ?? 1,
    source_query: overrides.source_query ?? null,
    last_verified: overrides.last_verified ?? null,
    review_level: overrides.review_level ?? null,
    review_flag: overrides.review_flag ?? null,
  };
}

test("moodMatchesVenue maps existing categories into user friendly moods", () => {
  assert.equal(moodMatchesVenue(venue({ subcategories: "padel" }), "active"), true);
  assert.equal(
    moodMatchesVenue(
      venue({ category_slug: "creative-chill", category_slugs: "creative-chill" }),
      "chill",
    ),
    true,
  );
  assert.equal(moodMatchesVenue(venue({ subcategories: "parks" }), "outdoor"), true);
  assert.equal(moodMatchesVenue(venue({ subcategories: "cinemas" }), "indoor"), true);
});

test("filterVenuesForDisplay filters by area, rating, mood, and distance", () => {
  const venues = [
    venue({ name: "Near Padel", subcategories: "padel", rating: 4.8 }),
    venue({
      name: "Far Padel",
      subcategories: "padel",
      rating: 4.7,
      latitude: 24.95,
      longitude: 67.18,
      area: "Malir",
      address: "Malir, Karachi",
    }),
    venue({
      name: "Low Rated Cinema",
      subcategories: "cinemas",
      rating: 3.5,
      area: "Clifton",
      address: "Clifton, Karachi",
    }),
  ];

  const filtered = filterVenuesForDisplay(
    venues,
    { area: "Clifton", minRating: 4.5, mood: "active", maxDistanceKm: 5 },
    { latitude: 24.8138, longitude: 67.0305 },
  );

  assert.deepEqual(filtered.map((v) => v.name), ["Near Padel"]);
});

test("filterVenuesForDisplay can keep only places open now", () => {
  const filtered = filterVenuesForDisplay(
    [
      venue({
        name: "Always Open",
        hours:
          '{"Friday":["Open 24 hours"],"Monday":["Open 24 hours"],"Saturday":["Open 24 hours"],"Sunday":["Open 24 hours"],"Thursday":["Open 24 hours"],"Tuesday":["Open 24 hours"],"Wednesday":["Open 24 hours"]}',
      }),
      venue({ name: "Unknown Hours", hours: null }),
    ],
    { openNow: true },
    null,
  );

  assert.deepEqual(filtered.map((v) => v.name), ["Always Open"]);
});

test("tonightPicks returns a short balanced list sorted by quality", () => {
  const picks = tonightPicks(
    [
      venue({ name: "Tiny Perfect", rating: 5, review_count: 2 }),
      venue({ name: "Strong", rating: 4.7, review_count: 200 }),
      venue({ name: "Better", rating: 4.9, review_count: 80 }),
      venue({ name: "Okay", rating: 4.1, review_count: 800 }),
    ],
    { minRating: 4.2 },
    null,
    2,
  );

  assert.deepEqual(picks.map((v) => v.name), ["Better", "Strong"]);
});
