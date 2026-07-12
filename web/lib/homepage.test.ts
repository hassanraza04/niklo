import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const pageSource = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
const venuesSource = readFileSync(join(process.cwd(), "lib", "venues.ts"), "utf8");

test("home page puts browsing before the Tonight Finder without Niklo picks", () => {
  assert.ok(pageSource.indexOf("Browse by type") < pageSource.indexOf("<TonightFinder"));
  assert.doesNotMatch(pageSource, /Niklo picks|@\/lib\/collections/);
});

test("crowd favourites are ordered by popularity", () => {
  const start = venuesSource.indexOf("export async function topVenues");
  const end = venuesSource.indexOf("export async function countsBySubcategory");
  const topVenuesSource = venuesSource.slice(start, end);

  assert.match(topVenuesSource, /order by review_count desc nulls last, rating desc nulls last, name/);
});
