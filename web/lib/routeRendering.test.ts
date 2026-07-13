import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const publicRoutes = [
  "app/page.tsx", "app/map/page.tsx", "app/saved/page.tsx", "app/search/page.tsx",
  "app/spin/page.tsx", "app/plan/page.tsx", "app/v/[slug]/page.tsx",
  "app/c/[category]/page.tsx", "app/c/[category]/[subcategory]/page.tsx",
];

test("directory routes are static and do not import D1", () => {
  for (const path of publicRoutes) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    assert.doesNotMatch(source, /force-dynamic|@\/lib\/venues|@\/lib\/db/);
  }
});

test("browser directory routes render static client shells", () => {
  const shells = {
    "app/map/page.tsx": "MapMode",
    "app/saved/page.tsx": "SavedList",
    "app/search/page.tsx": "SearchResults",
    "app/plan/page.tsx": "PlanResults",
  };

  for (const [path, component] of Object.entries(shells)) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    assert.doesNotMatch(source, /searchParams/);
    assert.match(source, new RegExp(`return <${component}`));
  }
});

test("tonight finder loads its own client catalog without a required venues prop", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "TonightFinder.tsx"),
    "utf8",
  );

  assert.match(source, /useClientCatalog\(\)/);
  assert.match(source, /export function TonightFinder\(\)/);
});

test("venue routes enumerate the reviewed catalog at build time", () => {
  const source = readFileSync(join(process.cwd(), "app", "v", "[slug]", "page.tsx"), "utf8");

  assert.match(source, /export function generateStaticParams/);
  assert.match(source, /\bcatalogSlugs,?\s*\n?\s*getCatalogVenue/);
  assert.doesNotMatch(source, /catalogSlugs as|function catalogSlugs/);
  assert.match(source, /return catalogSlugs\(\)\.map/);
});

test("venue pages describe the Maps date as a source check", () => {
  const route = readFileSync(join(process.cwd(), "app", "v", "[slug]", "page.tsx"), "utf8");

  assert.match(route, /Last checked/);
  assert.doesNotMatch(route, /Last verified/);
});
