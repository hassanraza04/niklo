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

test("the deployed Worker has no D1 binding after catalog migration", () => {
  const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
  assert.doesNotMatch(config, /d1_databases|"DB"/);
});

test("the Worker uses the installed Wrangler compatibility date", () => {
  const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
  assert.match(config, /"compatibility_date": "2026-07-02"/);
});

test("the Worker keeps dashboard observability settings in Wrangler", () => {
  const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
  assert.match(config, /"observability": \{/);
  assert.match(config, /"logs": \{[\s\S]*?"invocation_logs": true/);
  assert.match(config, /"traces": \{[\s\S]*?"persist": true/);
});

test("generated Worker bindings do not retain D1", () => {
  const bindings = readFileSync(join(process.cwd(), "cloudflare-env.d.ts"), "utf8");
  assert.doesNotMatch(bindings, /\bDB\s*:|\bD1Database\b/);
});

test("OpenNext intercepts static catalog cache entries before NextServer", () => {
  const config = readFileSync(join(process.cwd(), "open-next.config.ts"), "utf8");

  assert.match(config, /static-assets-incremental-cache/);
  assert.match(config, /get:\s*staticAssetsIncrementalCache\.get\.bind/);
  assert.match(config, /set:\s*async\s*\(\)\s*=>\s*\{\}/);
  assert.match(config, /delete:\s*async\s*\(\)\s*=>\s*\{\}/);
  assert.match(config, /incrementalCache:\s*readOnlyStaticAssetsCache/);
  assert.match(config, /enableCacheInterception:\s*true/);
});

test("generated preview output is ignored by lint and Git", () => {
  const eslint = readFileSync(join(process.cwd(), "eslint.config.mjs"), "utf8");
  const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");

  assert.match(eslint, /"\.wrangler\/\*\*"/);
  assert.match(gitignore, /^\/?\.wrangler\/$/m);
});

test("only contact routes remain dynamic", () => {
  const contact = readFileSync(join(process.cwd(), "app", "contact", "page.tsx"), "utf8");
  const contactApi = readFileSync(join(process.cwd(), "app", "api", "contact", "route.ts"), "utf8");
  assert.match(contact, /force-dynamic/);
  assert.match(contactApi, /force-dynamic/);
});

test("the application sends strict browser security headers", () => {
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /poweredByHeader:\s*false/);
  assert.doesNotMatch(config, /remotePatterns/);
});

test("production metadata defaults to the live Workers hostname", () => {
  for (const path of ["app/layout.tsx", "app/robots.ts", "app/sitemap.ts", ".env.example"]) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    assert.match(source, /https:\/\/niklo\.nikloapp\.workers\.dev/);
  }
});

test("robots keeps raw catalog data and write routes out of search indexes", () => {
  const robots = readFileSync(join(process.cwd(), "app", "robots.ts"), "utf8");

  assert.match(robots, /"\/api\/"/);
  assert.match(robots, /"\/catalog-client\.json"/);
  assert.match(robots, /"\/contact"/);
  assert.match(robots, /"\/saved"/);
});
