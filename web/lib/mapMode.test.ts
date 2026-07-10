import test from "node:test";
import assert from "node:assert/strict";
import {
  KARACHI_MAP_CENTER,
  MAP_TILE_PROVIDER,
  USER_LOCATION_MARKER,
  filteredMapVenues,
  mapCameraForLocation,
  mapCameraForVenue,
  mapBounds,
  mapPointStyle,
  primaryCategorySlug,
  type MapVenue,
} from "./mapMode.ts";

const venues: MapVenue[] = [
  {
    slug: "padel-one",
    name: "Padel One",
    category_slug: "sports-active",
    category_name: "Sports & Active",
    subcategory_slug: "padel",
    subcategory_name: "Padel",
    category_slugs: "sports-active,entertainment",
    subcategories: "padel",
    latitude: 24.8,
    longitude: 67.02,
    area: "Clifton",
    rating: 4.5,
    review_count: 100,
  },
  {
    slug: "cinema-one",
    name: "Cinema One",
    category_slug: "entertainment",
    category_name: "Entertainment",
    subcategory_slug: "cinemas",
    subcategory_name: "Cinemas",
    category_slugs: "entertainment",
    subcategories: "cinemas",
    latitude: 24.9,
    longitude: 67.12,
    area: "DHA",
    rating: 4.2,
    review_count: 40,
  },
];

test("primaryCategorySlug uses the first category membership", () => {
  assert.equal(primaryCategorySlug(venues[0]), "sports-active");
});

test("filteredMapVenues keeps venues matching selected categories", () => {
  assert.deepEqual(
    filteredMapVenues(venues, new Set(["entertainment"])).map((venue) => venue.slug),
    ["padel-one", "cinema-one"],
  );
  assert.deepEqual(
    filteredMapVenues(venues, new Set(["sports-active"])).map((venue) => venue.slug),
    ["padel-one"],
  );
});

test("filteredMapVenues can narrow an active category to a subcategory", () => {
  assert.deepEqual(
    filteredMapVenues(
      venues,
      new Set(["sports-active", "entertainment"]),
      new Set(["padel"]),
    ).map((venue) => venue.slug),
    ["padel-one"],
  );
});

test("mapPointStyle converts coordinates into bounded percentages", () => {
  const bounds = mapBounds(venues, { latitude: 24.85, longitude: 67.08 });
  const style = mapPointStyle({ latitude: 24.8, longitude: 67.02 }, bounds);

  assert.ok(Math.abs(style.left - 8.333333333333925) < 0.000001);
  assert.ok(Math.abs(style.top - 91.66666666666726) < 0.000001);
});

test("map tile provider uses zoomable OSM tiles with attribution", () => {
  assert.equal(
    MAP_TILE_PROVIDER.url,
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  );
  assert.match(MAP_TILE_PROVIDER.attribution, /OpenStreetMap/);
  assert.deepEqual(KARACHI_MAP_CENTER, [24.8607, 67.0011]);
});

test("mapCameraForVenue brings a selected place into clear view", () => {
  assert.deepEqual(mapCameraForVenue(venues[0]), {
    center: [24.8, 67.02],
    zoom: 16,
  });
});

test("mapCameraForLocation brings the user into clear view", () => {
  assert.deepEqual(
    mapCameraForLocation({ latitude: 24.8138, longitude: 67.0305 }),
    {
      center: [24.8138, 67.0305],
      zoom: 15,
    },
  );
  assert.equal(mapCameraForLocation(null), null);
});

test("user location marker remains visible instead of opening a self-covering popup", () => {
  assert.deepEqual(USER_LOCATION_MARKER, {
    size: 42,
    anchor: 21,
    opensPopup: false,
  });
});
