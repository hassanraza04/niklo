import assert from "node:assert/strict";
import test from "node:test";
import type { Venue } from "./types";
import {
  catalog,
  catalogByCategory,
  catalogBySlugs,
  catalogBySubcategory,
  catalogCountsByCategory,
  catalogCountsBySubcategory,
  catalogSlugs,
  catalogTopVenues,
  getCatalogVenue,
} from "./catalog.ts";

function fixtureVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    venue_id: "fixture-id",
    name: "Fixture venue",
    slug: "fixture",
    subcategory_slug: "fallback-subcategory",
    subcategory_name: "Fallback subcategory",
    category_slug: "fallback-category",
    category_name: "Fallback category",
    subcategories: "fallback-subcategory",
    category_slugs: "fallback-category",
    google_category: null,
    rating: null,
    review_count: null,
    latitude: null,
    longitude: null,
    area: null,
    address: null,
    city: null,
    price_level: null,
    website: null,
    phone: null,
    hours: null,
    photo_url: null,
    photos: null,
    google_url: null,
    status: null,
    is_open: null,
    source_query: null,
    last_verified: null,
    ...overrides,
  };
}

test("catalog membership respects every csv value", () => {
  const venues = [
    fixtureVenue({ slug: "multi", category_slugs: "sports-active,culture", subcategories: "padel,heritage" }),
    fixtureVenue({ slug: "single", category_slugs: "culture", subcategories: "heritage" }),
  ];
  assert.deepEqual(catalogByCategory("culture", venues).map((venue) => venue.slug), ["multi", "single"]);
  assert.deepEqual(catalogBySubcategory("padel", venues).map((venue) => venue.slug), ["multi"]);
});

test("catalog popularity sorts reviews, rating, then name", () => {
  const venues = [
    fixtureVenue({ slug: "b", name: "B", review_count: 20, rating: 4.4 }),
    fixtureVenue({ slug: "a", name: "A", review_count: 20, rating: 4.7 }),
  ];
  assert.deepEqual(catalogTopVenues(2, venues).map((venue) => venue.slug), ["a", "b"]);
});

test("catalog counts trim csv values and count multi-membership", () => {
  const venues = [
    fixtureVenue({ category_slugs: "sports-active, culture,", subcategories: " padel, heritage " }),
    fixtureVenue({ category_slugs: "culture", subcategories: "heritage" }),
  ];
  assert.deepEqual(catalogCountsByCategory(venues), { "sports-active": 1, culture: 2 });
  assert.deepEqual(catalogCountsBySubcategory(venues), { padel: 1, heritage: 2 });
});

test("catalog slug selectors preserve requested order and skip unknown slugs", () => {
  const venues = [fixtureVenue({ slug: "first" }), fixtureVenue({ slug: "second" })];
  assert.equal(getCatalogVenue("first", venues)?.slug, "first");
  assert.equal(getCatalogVenue("missing", venues), null);
  assert.deepEqual(catalogBySlugs(["second", "missing", "first"], venues).map((venue) => venue.slug), ["second", "first"]);
});

test("catalog exports the generated static data", () => {
  assert.equal(catalog.length, 452);
  assert.equal(catalogSlugs.length, catalog.length);
  assert.equal(catalogSlugs[0], catalog[0]?.slug);
});
