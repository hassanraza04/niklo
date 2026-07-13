# Static Public Catalog Design

## Goal

Serve Niklo's public directory without per-request D1 queries or server-side page
rendering. This removes the Cloudflare Workers Free CPU-limit failures that are
making ordinary navigation slow and unreliable.

The directory must remain free to run, keep its existing data safeguards, and
continue to update after reviewed listing-data changes reach `main`.

## Problem

Niklo currently renders public routes dynamically and reads D1 during visitor
requests. The home route also sends a large venue collection into a client
component. Cloudflare Workers Free permits only 10 ms of CPU time per HTTP
request. The production logs show that these requests exceed that limit.

Changing page animations would not solve this. Pages and Workers Functions use
the same Worker execution limits. The durable fix is to move public catalogue
work to build time and serve static files from Cloudflare's CDN.

## Chosen Approach

Generate a public catalog snapshot from the reviewed D1 seed during the existing
pipeline. Next.js imports that snapshot at build time to pre-render public
listing pages. Interactive tools load a compact static client catalog when they
need it.

The public site does not query D1 at request time. D1 remains useful as the
structured export and local validation target, but it is no longer a dependency
for visitor browsing.

## Catalog Artifacts

Add a deterministic exporter that reads `infra/d1/schema.sql` and
`infra/d1/seed.sql`, just like the existing live-listing export.

It writes two generated files:

- `web/data/catalog.json`: full public venue records for build-time page
  generation, related-place selection, category pages, metadata, and sitemap.
- `web/public/catalog-client.json`: a compact card and coordinate index for
  search, saved places, the map, the spinner, and the Tonight finder. It includes
  only fields those browser tools need.

Both files contain only Niklo-managed public facts. They retain downloaded local
photo paths and never restore Google image hotlinks. They are sorted by slug so
the output stays stable and reviewable in Git.

The exporter validates that every venue has a unique slug and that the client
index has the same venue ids and slugs as the full catalog. The existing release
checks will verify that all three generated artifacts match the seed.

## Static Route Model

The following visitor-facing routes become static build output:

- `/`
- `/c/[category]`
- `/c/[category]/[subcategory]`
- `/v/[slug]`
- `/map`
- `/saved`
- `/search`
- `/spin`
- `/plan`
- `/sitemap.xml`

Venue, category, and subcategory paths use `generateStaticParams`. Route modules
read the build catalog instead of `web/lib/db.ts`. Public pages will not export
`dynamic = "force-dynamic"`.

Map, search, saved places, the spinner, and the Tonight finder stay interactive
in the browser. They fetch `/catalog-client.json`, a CDN-cached static asset,
when needed. Browser storage continues to hold saved slugs and an opted-in user
location only on that visitor's device.

Opening-state labels should be calculated in the browser from stored hours and
the visitor's local time where practical. They must not trigger a Worker request.

## Dynamic Exceptions

`/contact` and `/api/contact` remain dynamic because Turnstile and Resend need
runtime Worker bindings. They do not query D1 and have a small request surface,
so they remain suitable for the free Worker limit.

After all public directory reads are migrated, remove the production D1 binding
from the deployed Worker configuration. Keep the generated D1 schema and seed
for local validation and the data pipeline. This keeps deployment independent of
a remote database id while preserving the current reviewable data model.

## Refresh and Publishing Flow

1. The daily workflow picks a rotating batch of existing live listings only.
2. It applies safe verified facts to `infra/d1/seed.sql` and
   `data/live_listings.csv`; risky changes remain in review artifacts.
3. It runs the catalog exporter so the static files reflect those safe updates.
4. The changes are reviewed and committed to `main`.
5. Cloudflare's Git build produces a new static site. The CDN serves the updated
   directory once that build is live.

Candidate discovery remains separate. It may create review material but cannot
change the static catalog until a place is manually approved and enters the
cleaned seed.

No workflow directly writes to production D1. A successful Git deployment is the
single publication step for public listing data.

## Navigation and Perceived Speed

Make Browse an explicit client scroll action. Every click scrolls to `#browse`,
even when the visitor is already on the home route and has scrolled elsewhere.
The action updates the hash without adding duplicate browser-history entries.

Use native smooth scrolling only where the visitor has not requested reduced
motion. Do not add page-transition animation as a performance workaround. Once
the site is static, any animation can be evaluated as a small visual enhancement
without hiding server latency.

## Non-Goals

- No new authentication or server-side saved-list feature.
- No automatic admission of discovery candidates.
- No paid Cloudflare plan or external database.
- No change to the contact recipient, Turnstile policy, or cached-image policy.
- No visual redesign beyond the Browse navigation correction needed for this
  performance change.

## Verification

- Test catalog generation, deterministic ordering, field filtering, and parity
  with the seed and live-listing export.
- Test static venue, category, subcategory, and sitemap parameter generation.
- Test browser catalog loading and the Browse action when the page is already
  open and scrolled away from the Browse section.
- Run unit tests, lint, `next build`, and `opennextjs-cloudflare build`.
- Inspect the generated build to confirm the public listing routes are static and
  no production route imports the D1 access module.
- Deploy to the existing Worker and confirm normal `/`, `/saved`, `/map`, a
  category page, and a venue page no longer create Worker CPU-limit errors.

## Rollout

Land the catalog generator and its tests first. Then convert public routes in
small groups, starting with venue and category pages, then the home and client
tools. Remove the public Worker D1 binding only after the full static build and
production smoke test pass.
