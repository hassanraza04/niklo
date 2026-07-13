# Static Public Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve public Niklo directory routes as static build output so normal visitors do not consume Cloudflare Worker CPU time.

**Architecture:** The reviewed D1 seed remains canonical. A deterministic Python exporter creates a full build catalog and a smaller browser catalog. Server components import the full catalog at build time. Browser tools fetch the compact catalog from a static asset. Only contact and its email endpoint remain dynamic.

**Tech Stack:** Python 3.12, SQLite seed validation, Next.js 16, React 19, TypeScript, Cloudflare OpenNext, Node built-in test runner.

## Global Constraints

- The project remains free to operate. Do not require a paid Cloudflare plan or external service.
- Daily refresh updates existing reviewed listings only. Candidate discovery remains review-only.
- Public images remain Niklo-managed local paths. Do not add Google image hotlinks.
- Saved places and opted-in location remain local to each browser.
- `hr2616@nyu.edu` remains the visible direct-contact address. The form recipient remains `hassanraza0406@gmail.com`.
- `/contact` and `/api/contact` remain dynamic for Turnstile and Resend. They must not read D1.
- Normal directory routes must not import `@/lib/db`, `@/lib/venues`, or call D1 at request time.
- Keep commits small with simple messages.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `pipeline/export_catalog.py` | Reads the seed and writes deterministic full and browser catalog JSON files. |
| `tests/test_export_catalog.py` | Covers catalog generation, safety, and consistency. |
| `web/data/catalog.json` | Full public venue data for build-time routes. |
| `web/public/catalog-client.json` | Compact browser data for interactive tools. |
| `web/lib/catalog.ts` | Typed static selectors for pages and sitemap generation. |
| `web/lib/clientCatalog.ts` | Browser fetch cache and client-side search. |
| `web/components/SearchResults.tsx` | Browser search results. |
| `web/components/PlanResults.tsx` | Browser shared-shortlist results. |
| `web/components/BrowseLink.tsx` | Repeated Browse scrolling from any route. |

### Task 1: Generate and Guard the Static Catalog

**Files:**
- Create: `pipeline/export_catalog.py`
- Create: `tests/test_export_catalog.py`
- Create: `web/data/catalog.json`
- Create: `web/public/catalog-client.json`
- Modify: `pipeline/run.sh`
- Modify: `pipeline/apply_daily_updates.py`
- Modify: `pipeline/release_checks.py`
- Modify: `.github/workflows/predeploy.yml`
- Modify: `docs/operations/update-runbook.md`

**Interfaces:**
- Consumes: `pipeline.seed_checks.load_seed_database(schema_path, seed_path, database_path)` and `pipeline.export_to_d1.COLUMNS`.
- Produces: `export_catalog(schema_path, seed_path, server_output, client_output) -> int`.
- Produces: full `Venue` JSON records and browser `CatalogCardVenue` JSON records.

- [ ] **Step 1: Write the failing exporter tests**

Create `tests/test_export_catalog.py` with a two-row seed fixture. One record has `/venues/alpha.jpg`; the other has a Google-hosted URL. The browser export must exclude private detail fields and only keep Niklo-managed image paths.

~~~python
def test_exports_sorted_full_and_compact_catalogs(self):
    count = export_catalog.export_catalog(schema, seed, full, client)
    full_rows = json.loads(full.read_text(encoding="utf-8"))
    client_rows = json.loads(client.read_text(encoding="utf-8"))
    self.assertEqual(2, count)
    self.assertEqual(["alpha", "zulu"], [row["slug"] for row in full_rows])
    self.assertEqual(["alpha", "zulu"], [row["slug"] for row in client_rows])
    self.assertEqual("/venues/alpha.jpg", full_rows[0]["photo_url"])
    self.assertNotIn("website", client_rows[0])
    self.assertNotIn("phone", client_rows[0])
    self.assertNotIn("google_url", client_rows[0])
    self.assertNotIn("lh3.googleusercontent.com", client.read_text(encoding="utf-8"))

def test_rejects_duplicate_slug_in_the_seed(self):
    write_seed([venue_row("one", "same"), venue_row("two", "same")], str(seed))
    with self.assertRaisesRegex(ValueError, "duplicate slug: same"):
        export_catalog.export_catalog(schema, seed, full, client)
~~~

- [ ] **Step 2: Run the exporter tests and confirm they fail**

Run: `python -m unittest tests.test_export_catalog -v`

Expected: `ImportError` because `pipeline.export_catalog` does not exist.

- [ ] **Step 3: Implement the deterministic exporter**

Create `pipeline/export_catalog.py`. Use `load_seed_database` in a temporary directory. Read `COLUMNS` from `venues`, convert rows to dictionaries, reject repeated `venue_id` and `slug`, sort by `slug`, and write UTF-8 JSON with two-space indentation and a trailing newline.

~~~python
CLIENT_FIELDS = (
    "venue_id", "name", "slug", "subcategory_slug", "subcategory_name",
    "category_slug", "category_name", "subcategories", "category_slugs",
    "rating", "review_count", "latitude", "longitude", "area", "address",
    "hours", "photo_url", "is_open",
)

def export_catalog(schema_path, seed_path, server_output, client_output):
    rows = load_seed_rows(schema_path, seed_path)
    assert_unique(rows, "venue_id")
    assert_unique(rows, "slug")
    rows.sort(key=lambda row: row["slug"])
    for row in rows:
        if row["photo_url"] and not row["photo_url"].startswith("/venues/"):
            row["photo_url"] = None
    client_rows = [{field: row[field] for field in CLIENT_FIELDS} for row in rows]
    write_json(server_output, rows)
    write_json(client_output, client_rows)
    return len(rows)
~~~

- [ ] **Step 4: Generate the catalog whenever the seed changes**

After `export_to_d1.py` in `pipeline/run.sh`, add:

~~~bash
echo ">> export static web catalog"
uv run python export_catalog.py | tail -1
~~~

In `pipeline/apply_daily_updates.py`, import `export_catalog` beside `export_live_listings`. After `write_seed(...)` and `export_live_listings(...)`, add:

~~~python
export_catalog(
    schema_path,
    seed_path,
    ROOT / "web" / "data" / "catalog.json",
    ROOT / "web" / "public" / "catalog-client.json",
)
~~~

In `pipeline/release_checks.py`, regenerate both JSON files into a temporary directory and compare parsed JSON with committed `web/data/catalog.json` and `web/public/catalog-client.json`. Print `PASS catalog_lock: <count> listings match the generated catalog` and `PASS client_catalog: compact browser catalog matches the generated seed`.

In the web CI job, add this step before `npm ci`:

~~~yaml
- name: Generate static catalog
  run: python ../pipeline/export_catalog.py --server-output data/catalog.json --client-output public/catalog-client.json
~~~

Update `docs/operations/update-runbook.md` to say safe daily refresh regenerates both catalog files and that committing them is how safe listing updates reach the live site.

- [ ] **Step 5: Run the tests and create committed artifacts**

Run: `python -m unittest tests.test_export_catalog -v && python pipeline/export_catalog.py && python pipeline/release_checks.py`

Expected: all commands exit zero and the JSON files contain the same record count as `data/live_listings.csv`.

- [ ] **Step 6: Commit the catalog pipeline**

Run: `git add pipeline/export_catalog.py pipeline/run.sh pipeline/apply_daily_updates.py pipeline/release_checks.py tests/test_export_catalog.py web/data/catalog.json web/public/catalog-client.json .github/workflows/predeploy.yml docs/operations/update-runbook.md && git commit -m "add static catalog"`

### Task 2: Create Typed Static Catalog Selectors

**Files:**
- Create: `web/lib/catalog.ts`
- Create: `web/lib/catalog.test.ts`
- Modify: `web/lib/types.ts`
- Modify: `web/components/VenueCard.tsx`
- Modify: `web/lib/homepage.test.ts`

**Interfaces:**
- Consumes: `web/data/catalog.json`.
- Produces: `catalog`, `getCatalogVenue`, `catalogByCategory`, `catalogBySubcategory`, `catalogCountsByCategory`, `catalogCountsBySubcategory`, `catalogTopVenues`, `catalogSlugs`, and `catalogBySlugs`.

- [ ] **Step 1: Write failing selector tests**

Create `web/lib/catalog.test.ts` using pure functions that accept an optional fixture venue list.

~~~ts
test("catalog membership respects every csv value", () => {
  const venues = [
    fixtureVenue({ slug: "multi", category_slugs: "sports-active,culture", subcategories: "padel,heritage" }),
    fixtureVenue({ slug: "single", category_slugs: "culture", subcategories: "heritage" }),
  ];
  assert.deepEqual(catalogByCategory("culture", venues).map((venue) => venue.slug), ["multi", "single"]);
  assert.deepEqual(catalogBySubcategory("padel", venues).map((venue) => venue.slug), ["multi"]);
});

test("catalog popularity sorts reviews, rating, then name", () => {
  const venues = [fixtureVenue({ slug: "b", name: "B", review_count: 20, rating: 4.4 }), fixtureVenue({ slug: "a", name: "A", review_count: 20, rating: 4.7 })];
  assert.deepEqual(catalogTopVenues(2, venues).map((venue) => venue.slug), ["a", "b"]);
});
~~~

- [ ] **Step 2: Run tests and confirm they fail**

Run: `cd web && node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/catalog.test.ts`

Expected: failure because `lib/catalog.ts` does not exist.

- [ ] **Step 3: Implement synchronous selectors**

Create `web/lib/catalog.ts`. Import `../data/catalog.json` once. No function in this module is async and none imports Cloudflare APIs.

~~~ts
import rawCatalog from "../data/catalog.json";
import type { Venue } from "./types";

export const catalog = rawCatalog as readonly Venue[];

export function catalogBySubcategory(slug: string, venues = catalog): Venue[] {
  return venues.filter((venue) => csvValues(venue.subcategories ?? venue.subcategory_slug).includes(slug)).sort(popularityOrder);
}

export function catalogTopVenues(limit = 8, venues = catalog): Venue[] {
  return [...venues].filter((venue) => venue.review_count != null).sort(popularityOrder).slice(0, limit);
}
~~~

Implement `csvValues` with trim and empty-token removal. `popularityOrder` compares review count descending, rating descending, then `name.localeCompare`. `catalogBySlugs` preserves requested slug order and skips unknown slugs.

In `web/lib/types.ts`, add `CatalogCardVenue` with the exact fields from Task 1's `CLIENT_FIELDS`. Change `VenueCard` to accept `CatalogCardVenue`. Update `web/lib/homepage.test.ts` to inspect `catalog.ts`, not `venues.ts`, for popularity ordering.

- [ ] **Step 4: Run tests and commit selectors**

Run: `cd web && node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/catalog.test.ts lib/homepage.test.ts lib/venueFilters.test.ts`

Expected: all tests pass.

Run: `git add web/lib/catalog.ts web/lib/catalog.test.ts web/lib/types.ts web/components/VenueCard.tsx web/lib/homepage.test.ts && git commit -m "add catalog helpers"`

### Task 3: Pre-render the Directory and Sitemap

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/app/v/[slug]/page.tsx`
- Modify: `web/app/c/[category]/page.tsx`
- Modify: `web/app/c/[category]/[subcategory]/page.tsx`
- Modify: `web/app/spin/page.tsx`
- Modify: `web/app/sitemap.ts`
- Create: `web/components/SubcategoryResults.tsx`
- Modify: `web/lib/routeRendering.test.ts`

**Interfaces:**
- Consumes: selectors from `@/lib/catalog` and taxonomy from `@/lib/taxonomy`.
- Produces: build-time `generateStaticParams` for venue, category, and subcategory routes.
- Produces: `<SubcategoryResults venues={Venue[]} />`, which owns the Open now toggle in the browser.

- [ ] **Step 1: Write failing static-route assertions**

Replace the request-time expectation in `web/lib/routeRendering.test.ts`.

~~~ts
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
~~~

- [ ] **Step 2: Run the assertions and confirm they fail**

Run: `cd web && npm run test:unit -- lib/routeRendering.test.ts`

Expected: failure because public routes still contain `force-dynamic` and D1 imports.

- [ ] **Step 3: Convert build-time directory pages to catalog selectors**

Remove `force-dynamic` and D1 imports from every listed server page. Use `catalog`, `catalogCountsByCategory()`, `catalogCountsBySubcategory()`, `catalogTopVenues(8)`, `getCatalogVenue(slug)`, `catalogByCategory(slug)`, and `catalogBySubcategory(slug)`.

Add these static parameter functions:

~~~ts
export function generateStaticParams() {
  return catalogSlugs().map((slug) => ({ slug }));
}

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((subcategory) => ({ category: category.slug, subcategory: subcategory.slug })));
}
~~~

The three functions belong, in order, in venue, category, and subcategory route files. `app/sitemap.ts` maps `catalogSlugs()` to venue URLs. `app/spin/page.tsx` uses `catalogCountsBySubcategory()`. In `app/page.tsx`, derive hero photos from `catalog`, counts from `catalogCountsByCategory()`, favourites from `catalogTopVenues(8)`, and render `<TonightFinder />` without passing all venues.

- [ ] **Step 4: Move the Open now filter to a browser component**

Create `web/components/SubcategoryResults.tsx` with the existing button classes and empty-state wording. It receives the static venue array and owns `openOnly` state.

~~~tsx
"use client";

export function SubcategoryResults({ venues }: { venues: Venue[] }) {
  const [openOnly, setOpenOnly] = useState(false);
  const shown = openOnly ? venues.filter((venue) => isOpenNow(venue.hours) === true) : venues;
  return <><button type="button" onClick={() => setOpenOnly((value) => !value)} aria-pressed={openOnly}>● Open now</button><SortableVenueGrid venues={shown} /></>;
}
~~~

Remove `searchParams`, `URLSearchParams`, and Link-based `?open=1` handling from the subcategory route. The static page renders the same regardless of query string and the browser owns the current Open now filter.

- [ ] **Step 5: Run static-route tests and a production build**

Run: `cd web && npm run test:unit && npm run lint && npm run build`

Expected: tests pass and the build report marks home, venue, category, subcategory, spin, and sitemap output as static.

- [ ] **Step 6: Commit static server routes**

Run: `git add web/app/page.tsx web/app/v/'[slug]'/page.tsx web/app/c/'[category]'/page.tsx web/app/c/'[category]'/'[subcategory]'/page.tsx web/app/spin/page.tsx web/app/sitemap.ts web/components/SubcategoryResults.tsx web/lib/routeRendering.test.ts && git commit -m "make directory static"`

### Task 4: Move Browser Tools to the Static Client Catalog

**Files:**
- Create: `web/lib/clientCatalog.ts`
- Create: `web/lib/clientCatalog.test.ts`
- Create: `web/components/CatalogLoader.tsx`
- Create: `web/components/SearchResults.tsx`
- Create: `web/components/PlanResults.tsx`
- Modify: `web/components/SearchBox.tsx`
- Modify: `web/components/TonightFinder.tsx`
- Modify: `web/components/MapMode.tsx`
- Modify: `web/components/SavedList.tsx`
- Modify: `web/app/map/page.tsx`
- Modify: `web/app/saved/page.tsx`
- Modify: `web/app/search/page.tsx`
- Modify: `web/app/plan/page.tsx`
- Delete: `web/app/api/search/route.ts`
- Delete: `web/lib/venueSearchPlan.ts`
- Delete: `web/lib/venueSearchPlan.test.ts`
- Modify: `web/lib/searchBox.test.ts`

**Interfaces:**
- Consumes: `/catalog-client.json` and `CatalogCardVenue`.
- Produces: `loadClientCatalog(): Promise<readonly CatalogCardVenue[]>`, `searchClientCatalog(query, venues, limit): CatalogCardVenue[]`, and `useClientCatalog()` returning `{ venues, loading, error, retry }`.

- [ ] **Step 1: Write failing client catalog tests**

Create `web/lib/clientCatalog.test.ts` around pure ranking and a mocked fetch cache.

~~~ts
test("client search puts exact venue names before partial matches and popularity", () => {
  const venues = [
    fixture({ name: "Marksman Arena", slug: "marksman", review_count: 5 }),
    fixture({ name: "Arena Marksman Sports", slug: "arena-marksman", review_count: 500 }),
  ];
  assert.deepEqual(searchClientCatalog("marksman arena", venues, 7).map((venue) => venue.slug), ["marksman", "arena-marksman"]);
});

test("client catalog fetches the static asset once per browser session", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return Response.json([fixture()]); };
  await loadClientCatalog();
  await loadClientCatalog();
  assert.equal(calls, 1);
});
~~~

- [ ] **Step 2: Run tests and confirm they fail**

Run: `cd web && node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/clientCatalog.test.ts`

Expected: failure because `lib/clientCatalog.ts` does not exist.

- [ ] **Step 3: Implement static client loading and ranking**

Create `web/lib/clientCatalog.ts`. Cache one in-flight promise and reject non-OK responses. Match current search behavior: tokenize up to six non-wildcard terms, first search name, area, category, subcategory, and memberships, then fall back to address only if strong fields produce no matches. Rank exact name, name prefix, name phrase, exact subcategory, exact category, exact area, address, reviews, rating, then name.

~~~ts
let catalogPromise: Promise<readonly CatalogCardVenue[]> | null = null;

export function loadClientCatalog(): Promise<readonly CatalogCardVenue[]> {
  catalogPromise ??= fetch("/catalog-client.json", { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error("Could not load Niklo's catalog.");
    return response.json() as Promise<CatalogCardVenue[]>;
  });
  return catalogPromise;
}

export function searchClientCatalog(query: string, venues: readonly CatalogCardVenue[], limit = 60) {
  const strong = rankedMatches(query, venues, false, limit);
  return strong.length ? strong : rankedMatches(query, venues, true, limit);
}
~~~

Create `CatalogLoader.tsx` with `useClientCatalog`. Start loading in `useEffect`, ignore updates after unmount, and expose a retry that clears the cached promise after an error.

- [ ] **Step 4: Replace dynamic browser tools with the static asset**

Make these route modules static shells with no `searchParams` and no D1 imports.

~~~tsx
export default function MapPage() { return <MapMode categories={categories} />; }
export default function SavedPage() { return <SavedList />; }
export default function SearchPage() { return <SearchResults />; }
export default function PlanPage() { return <PlanResults />; }
~~~

`SearchResults` reads `q` with `useSearchParams`, loads the catalog, calls `searchClientCatalog`, and retains the current title, count, grid, and no-results text. It renders `SearchBox size="lg" defaultValue={query}`.

`PlanResults` reads `v` with `useSearchParams`, keeps at most 50 slugs, preserves query order, looks up catalog records by slug, and reuses the current wheel, Add all action, cards, and empty state.

`MapMode`, `SavedList`, and `TonightFinder` call `useClientCatalog` internally. Before data resolves, use a fixed-height neutral loading region. On error, show `Could not load places. Please refresh and try again.` with a retry button. Map filters only records with coordinates. SavedList derives its coordinate fallback map from catalog. TonightFinder keeps its five-result pagination and full eligible-listing filter behavior.

`SearchBox` replaces `/api/search` with `loadClientCatalog()` and `searchClientCatalog(term, catalog, 7)`. Keep the 150 ms debounce, keyboard behavior, and result `Link` anchors. Delete the API route and SQL search-plan files only after all imports are removed.

- [ ] **Step 5: Update regressions and run focused tests**

Update `web/lib/searchBox.test.ts` to assert `loadClientCatalog` and `searchClientCatalog` imports and assert no `/api/search` string.

Run: `cd web && node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/clientCatalog.test.ts lib/searchBox.test.ts lib/venueFilters.test.ts lib/mapMode.test.ts`

Expected: all tests pass and search has no dynamic API route.

- [ ] **Step 6: Commit browser catalog migration**

Run: `git add web/lib/clientCatalog.ts web/lib/clientCatalog.test.ts web/components/CatalogLoader.tsx web/components/SearchResults.tsx web/components/PlanResults.tsx web/components/SearchBox.tsx web/components/TonightFinder.tsx web/components/MapMode.tsx web/components/SavedList.tsx web/app/map/page.tsx web/app/saved/page.tsx web/app/search/page.tsx web/app/plan/page.tsx web/lib/searchBox.test.ts && git rm web/app/api/search/route.ts web/lib/venueSearchPlan.ts web/lib/venueSearchPlan.test.ts && git commit -m "load catalog in browser"`

### Task 5: Make Browse Work Every Time

**Files:**
- Create: `web/components/BrowseLink.tsx`
- Create: `web/lib/browseLink.test.ts`
- Modify: `web/components/SiteHeader.tsx`
- Modify: `web/app/page.tsx`
- Modify: `web/app/search/page.tsx`
- Modify: `web/components/SavedList.tsx`
- Modify: `web/app/c/[category]/[subcategory]/page.tsx`

**Interfaces:**
- Produces: `<BrowseLink className?: string>{children}</BrowseLink>`.
- Behavior: from `/`, it scrolls to Browse on every click and uses `history.replaceState`; from another route it navigates to `/#browse`.

- [ ] **Step 1: Write failing Browse-link tests**

Create `web/lib/browseLink.test.ts` by exporting a pure helper from `BrowseLink.tsx`.

~~~ts
test("browse scrolls when the home hash is already present", () => {
  const calls: ScrollIntoViewOptions[] = [];
  const target = { scrollIntoView: (options: ScrollIntoViewOptions) => calls.push(options) } as Element;
  scrollToBrowse(target, false);
  scrollToBrowse(target, false);
  assert.deepEqual(calls, [{ behavior: "smooth", block: "start" }, { behavior: "smooth", block: "start" }]);
});

test("browse respects reduced motion", () => {
  const calls: ScrollIntoViewOptions[] = [];
  scrollToBrowse({ scrollIntoView: (options: ScrollIntoViewOptions) => calls.push(options) } as Element, true);
  assert.deepEqual(calls, [{ behavior: "auto", block: "start" }]);
});
~~~

- [ ] **Step 2: Run test and confirm it fails**

Run: `cd web && node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/browseLink.test.ts`

Expected: failure because `BrowseLink.tsx` does not exist.

- [ ] **Step 3: Implement and use the explicit scroll action**

Create the client component below.

~~~tsx
export function scrollToBrowse(target: Element, reducedMotion: boolean) {
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
}

export function BrowseLink({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  const pathname = usePathname();
  return <Link href="/#browse" className={className} onClick={(event) => {
    if (pathname !== "/") return;
    event.preventDefault();
    const target = document.getElementById("browse");
    if (!target) return;
    scrollToBrowse(target, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    window.history.replaceState(null, "", "/#browse");
  }}>{children}</Link>;
}
~~~

Replace every user-facing `href="/#browse"` in the listed files with `BrowseLink`. Preserve classes and labels. In the mobile menu, pass an `onClick` callback that sets `menuOpen` false before scrolling or navigation.

- [ ] **Step 4: Verify repeat scroll and mobile behavior**

Run: `cd web && node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON lib/browseLink.test.ts lib/homepage.test.ts`

Then use the local app to verify: click Browse twice after scrolling below Browse by type; click mobile Browse with its menu open; click Browse from a category route. Each test must land at Browse by type and the mobile menu must close.

- [ ] **Step 5: Commit Browse navigation**

Run: `git add web/components/BrowseLink.tsx web/lib/browseLink.test.ts web/components/SiteHeader.tsx web/app/page.tsx web/app/search/page.tsx web/components/SavedList.tsx web/app/c/'[category]'/'[subcategory]'/page.tsx && git commit -m "fix browse link"`

### Task 6: Remove the Public Worker Database Dependency and Verify Production Output

**Files:**
- Delete: `web/lib/db.ts`
- Delete: `web/lib/venues.ts`
- Modify: `web/wrangler.jsonc`
- Modify: `web/package.json`
- Modify: `pipeline/daily_refresh.sh`
- Modify: `pipeline/run.sh`
- Modify: `docs/operations/launch-checklist.md`
- Modify: `docs/operations/update-runbook.md`
- Modify: `web/lib/routeRendering.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior static route and browser catalog work.
- Produces: an OpenNext Worker with no `DB` binding and only the dynamic contact route surface.

- [ ] **Step 1: Write failing no-D1 deployment tests**

Extend `web/lib/routeRendering.test.ts`.

~~~ts
test("the deployed Worker has no D1 binding after catalog migration", () => {
  const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
  assert.doesNotMatch(config, /d1_databases|"DB"/);
});

test("only contact routes remain dynamic", () => {
  const contact = readFileSync(join(process.cwd(), "app", "contact", "page.tsx"), "utf8");
  const contactApi = readFileSync(join(process.cwd(), "app", "api", "contact", "route.ts"), "utf8");
  assert.match(contact, /force-dynamic/);
  assert.match(contactApi, /force-dynamic/);
});
~~~

- [ ] **Step 2: Run checks and confirm they fail**

Run: `cd web && npm run test:unit -- lib/routeRendering.test.ts`

Expected: failure because `wrangler.jsonc` still declares `d1_databases`.

- [ ] **Step 3: Remove dead runtime database code and binding**

Delete `web/lib/db.ts` and `web/lib/venues.ts`. Remove the complete `d1_databases` property from `web/wrangler.jsonc`, preserving `name`, `main`, compatibility settings, `keep_vars`, and static-assets configuration.

Remove `db:schema`, `db:seed`, and `db:reset` from `web/package.json`. Remove the local preview D1 reload blocks from `pipeline/daily_refresh.sh` and `pipeline/run.sh`. The generated seed, catalog exporter, and web build now provide the preview and validation route.

Add this exact documentation statement to both operations docs:

~~~md
Niklo builds the public catalog from `infra/d1/seed.sql`. D1 is a reviewed data export and validation source, not a runtime dependency of the deployed site.
~~~

Update `README.md` architecture and deployment text to describe static public catalog files, CDN delivery, the dynamic Turnstile contact exception, and the fact that Git commits to `main` publish reviewed listing updates through the Cloudflare build.

- [ ] **Step 4: Run all local verification gates**

Run:

~~~bash
python -m unittest discover -s tests -v
python pipeline/seed_checks.py
python pipeline/customer_flow_checks.py
python pipeline/release_checks.py
cd web
npm run test:unit
npm run lint
npm run build
npx opennextjs-cloudflare build
~~~

Expected: all commands exit zero. The Next build lists public directory routes as static. The OpenNext build succeeds without a D1 binding requirement.

- [ ] **Step 5: Perform production smoke checks after the Git build deploys**

Visit the Worker domain and test `/`, `/saved`, `/map`, one category page, one venue page, `/search?q=marksman`, a shared `/plan?v=...` URL, and `/contact`.

In Cloudflare Observability, filter the test window. Static directory visits must not create `Worker exceeded CPU time limit` errors. A contact form request may invoke the Worker, but must retain Turnstile verification and email delivery.

- [ ] **Step 6: Commit cleanup and documentation**

Run: `git add web/wrangler.jsonc web/package.json pipeline/daily_refresh.sh pipeline/run.sh docs/operations/launch-checklist.md docs/operations/update-runbook.md README.md web/lib/routeRendering.test.ts && git rm web/lib/db.ts web/lib/venues.ts && git commit -m "remove runtime database"`

## Final Review Checklist

- [ ] `git diff --check` is clean.
- [ ] `git status --short` contains only intentional generated catalog changes.
- [ ] The catalog files are generated, committed, and match the reviewed seed.
- [ ] `rg -n "@/lib/venues|@/lib/db|force-dynamic" web/app web/components web/lib` finds only contact dynamic declarations and no public directory D1 imports.
- [ ] The home Browse control scrolls correctly on repeated desktop and mobile clicks.
- [ ] Search suggestions remain normal links that can open in a new tab.
- [ ] Saved places, location, map filters, map user marker, spinner, search, and shared plan links work using the static client catalog.
- [ ] Cloudflare production logs stay clear of CPU-limit errors during normal directory navigation.
