import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const pageSource = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
const venuesSource = readFileSync(join(process.cwd(), "lib", "venues.ts"), "utf8");
const finderSource = readFileSync(join(process.cwd(), "components", "TonightFinder.tsx"), "utf8");
const layoutSource = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
const headerSource = readFileSync(join(process.cwd(), "components", "SiteHeader.tsx"), "utf8");
const footerSource = readFileSync(join(process.cwd(), "components", "SiteFooter.tsx"), "utf8");
const searchSource = readFileSync(join(process.cwd(), "app", "search", "page.tsx"), "utf8");
const categoryCardSource = readFileSync(join(process.cwd(), "components", "CategoryCard.tsx"), "utf8");

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

test("Tonight Finder queries every eligible listing before filtering", () => {
  const start = venuesSource.indexOf("export async function listFinderVenues");
  const end = venuesSource.indexOf("export async function getVenuesBySlugs");
  const finderSource = venuesSource.slice(start, end);

  assert.doesNotMatch(finderSource, /limit = 160|limit \?|\.bind\(limit\)/);
});

test("Tonight Finder keeps its filters in a stable row below the title", () => {
  assert.match(
    finderSource,
    /<div>\s*<p[^>]*>Tonight<\/p>\s*<h2[^>]*>\s*Find something that fits\s*<\/h2>\s*<\/div>\s*<div className="mt-5 flex flex-wrap items-center gap-3 text-sm">/,
  );
});

test("Niklo uses its own SVG tab icon", () => {
  assert.match(layoutSource, /icons:\s*\{\s*icon:\s*"\/icon\.svg"/);
  assert.match(readFileSync(join(process.cwd(), "app", "icon.svg"), "utf8"), /Niklo favicon/);
});

test("public navigation does not default visitors to padel", () => {
  assert.doesNotMatch(headerSource, /\/c\/sports-active\/padel/);
  assert.doesNotMatch(searchSource, /\/c\/sports-active\/padel|Browse padel instead/);
  assert.match(searchSource, /Browse all types/);
});

test("compact navigation keeps Saved and Map reachable", () => {
  const compactStart = headerSource.indexOf('<details className="relative md:hidden">');
  const compactEnd = headerSource.indexOf("</details>", compactStart);
  const compactNavigation = headerSource.slice(compactStart, compactEnd);

  assert.notEqual(-1, compactStart);
  assert.match(compactNavigation, /aria-label="Open navigation"/);
  assert.match(compactNavigation, /href="\/saved"/);
  assert.match(compactNavigation, /href="\/map"/);
});

test("footer links to the public repository instead of the retired review queue", () => {
  assert.match(footerSource, /https:\/\/github\.com\/hassanraza04\/niklo/);
  assert.doesNotMatch(footerSource, /href="\/review"/);
});

test("tab title describes Niklo without search-query wording", () => {
  assert.match(layoutSource, /default: "Niklo: Karachi plans"/);
  assert.doesNotMatch(layoutSource, /things to do in Karachi/);
});

test("category cards can shrink and wrap on small phones", () => {
  assert.match(categoryCardSource, /className="group flex min-w-0 flex-col/);
  assert.match(categoryCardSource, /className="break-words font-display text-xl/);
});
