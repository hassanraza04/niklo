import assert from "node:assert/strict";
import test from "node:test";
import type { CatalogCardVenue } from "./types.ts";
import {
  clearClientCatalogCache,
  loadClientCatalog,
  searchClientCatalog,
} from "./clientCatalog.ts";

function fixture(overrides: Partial<CatalogCardVenue> = {}): CatalogCardVenue {
  return {
    venue_id: "fixture-id",
    name: "Fixture Venue",
    slug: "fixture",
    subcategory_slug: "padel",
    subcategory_name: "Padel",
    category_slug: "sports-active",
    category_name: "Sports & Active",
    subcategories: "padel",
    category_slugs: "sports-active",
    rating: 4.5,
    review_count: 100,
    latitude: 24.8,
    longitude: 67.02,
    area: "Clifton",
    address: "Sea View Road, Karachi",
    hours: "{}",
    photo_url: null,
    is_open: 1,
    ...overrides,
  };
}

test("client search puts exact venue names before partial matches and popularity", () => {
  const venues = [
    fixture({ name: "Marksman Arena", slug: "marksman", review_count: 5 }),
    fixture({ name: "Arena Marksman Sports", slug: "arena-marksman", review_count: 500 }),
  ];

  assert.deepEqual(
    searchClientCatalog("marksman arena", venues, 7).map((venue) => venue.slug),
    ["marksman", "arena-marksman"],
  );
});

test("client search matches memberships and only falls back to addresses", () => {
  const venues = [
    fixture({ slug: "membership", subcategories: "padel,indoor-cricket" }),
    fixture({ slug: "address", subcategories: "padel", address: "Indoor Cricket Street" }),
  ];

  assert.deepEqual(
    searchClientCatalog("indoor cricket", venues).map((venue) => venue.slug),
    ["membership"],
  );
  assert.deepEqual(
    searchClientCatalog("cricket street", [venues[1]]).map((venue) => venue.slug),
    ["address"],
  );
});

test("client search ignores wildcard-only input", () => {
  assert.deepEqual(searchClientCatalog("% _", [fixture()]), []);
});

test("client catalog fetches the static asset once per browser session", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  clearClientCatalogCache();
  globalThis.fetch = async (input, init) => {
    calls += 1;
    assert.equal(input, "/catalog-client.json");
    assert.deepEqual(init, { cache: "no-cache" });
    return Response.json([fixture()]);
  };

  try {
    const first = await loadClientCatalog();
    const second = await loadClientCatalog();
    assert.equal(first, second);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearClientCatalogCache();
  }
});

test("client catalog rejects failed responses and can clear the failed cache", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  clearClientCatalogCache();
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response(null, { status: 503 })
      : Response.json([fixture({ slug: "recovered" })]);
  };

  try {
    await assert.rejects(loadClientCatalog(), /Could not load Niklo's catalog\./);
    clearClientCatalogCache();
    const venues = await loadClientCatalog();
    assert.equal(venues[0]?.slug, "recovered");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearClientCatalogCache();
  }
});
