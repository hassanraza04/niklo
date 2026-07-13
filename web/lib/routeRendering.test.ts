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

test("venue routes enumerate the reviewed catalog at build time", () => {
  const source = readFileSync(join(process.cwd(), "app", "v", "[slug]", "page.tsx"), "utf8");

  assert.match(source, /export function generateStaticParams/);
  assert.match(source, /catalogSlugs\(\)/);
});

test("venue pages describe the Maps date as a source check", () => {
  const route = readFileSync(join(process.cwd(), "app", "v", "[slug]", "page.tsx"), "utf8");

  assert.match(route, /Last checked/);
  assert.doesNotMatch(route, /Last verified/);
});
