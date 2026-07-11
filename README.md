# Niklo

A homey little directory of things to do in Karachi besides eat: padel, cinemas,
bowling, escape rooms, arcades, parks, all that. Browse by category, filter by area,
and when you genuinely can't decide, spin the wheel.

It started as a real itch (me and my friends hang out constantly and always end up
eating because we can't think of anything else), and turned into a nice excuse to
build a proper data pipeline end to end.

> Working name "Activit", going with **Niklo** (Urdu for "let's head out").

## how it works

```
google maps  ──gosom──▶  raw json  ──dlt──▶  duckdb  ──dbt──▶  dim_venue  ──▶  cloudflare d1  ──▶  next.js
  (scrape)                (per query)         (raw)    (dedupe)  (canonical)      (sqlite)         (the site)
```

1. **Scrape.** `gosom/google-maps-scraper`, run locally off my Karachi home line so
   the geo comes back correct (see `docs/part-c-ip-test.md` for why, and the safe
   concurrency/pacing I landed on). One query per run, low concurrency, pauses between.
2. **Pipeline.** `dlt` loads the scrape json into DuckDB, then `dbt` does the entity
   resolution: dedupe on Google's `place_id`, a name+geo fallback for the rare rows
   missing one, clip to the Karachi bbox, map to my taxonomy → `dim_venue`.
3. **Serve.** `dim_venue` gets pushed into Cloudflare D1; the Next.js app reads it.

Only thing kept from Google is the rating + review count (plus the public facts like
hours, phone, location). No review text rehosted; venue pages link out to Maps.

## the stack

- **Scrape:** gosom (native arm64 binary, because the docker image is amd64 and its
  chromium dies under emulation on Apple silicon)
- **Pipeline:** Python, dlt → dbt → DuckDB
- **App:** Next.js (App Router) + Tailwind, on Cloudflare via OpenNext
- **Data:** Cloudflare D1 (venues), bundled first-party photos

## layout

```
scraper/     gosom query files + run.sh (one query) + sweep.sh (a whole category)
pipeline/    dlt loader, dbt project (stg -> int -> dim_venue), export to d1
infra/d1/    d1 schema + generated seed
web/         next.js app
data/        taxonomy, the live listing allowlist, and verification reports
docs/        the ip-test writeup, launch checklist, and update runbook
```

## running it

**Scrape a category** (needs the gosom binary on PATH or at `~/go/bin`):

```bash
cd scraper
./sweep.sh queries/padel.txt padel        # writes out/padel/*.json
python3 analyze.py out/padel ../data/padel_ground_truth.json   # sanity check
```

**Build dim_venue:**

```bash
cd pipeline
uv sync
uv run python ingest/load.py              # scrape json -> duckdb
cd transform && uv run dbt build --profiles-dir .   # seeds + models + tests
cd .. && uv run python export_to_d1.py    # dim_venue -> infra/d1/seed.sql
```

**Run the site (local D1, no Cloudflare account needed):**

```bash
cd web
npm install
npm run db:schema && npm run db:seed      # load venues into local d1
npm run dev                               # http://localhost:3000
```

**Pre-deploy checks** (no Cloudflare account needed):

```bash
python3 pipeline/export_live_listings.py  # seed -> data/live_listings.csv
python3 pipeline/seed_checks.py           # validate generated d1 seed + local photos
python3 pipeline/customer_flow_checks.py  # browse, search, map, and saved-place smoke checks
python3 pipeline/release_checks.py        # committed allowlist matches the generated seed
python3 -m unittest discover -s tests -v  # pipeline guardrail tests
cd web && npm ci && npm run lint && npm run build
```

**Daily safe refresh for existing listings only:**

```bash
pipeline/daily_refresh.sh
```

This refresh only plans existing listing searches and writes review artifacts under
`data/verification/YYYY-MM-DD/`. It never changes the seed, the allowlist, or D1.
New place ids are quarantined in the report.

**Rare discovery run:**

```bash
pipeline/rare_discovery.sh scraper/out
```

This builds an isolated discovery warehouse and writes `data/discovery/YYYY-MM-DD/new_candidates.csv`.
Candidates stay pending until a manual evidence review adds them to the curated inputs and live allowlist.
See `docs/update-runbook.md` for both workflows.

**Photos**: source image URLs are pipeline-only. `photos.py` downloads each primary
image into `web/public/venues`, and `export_to_d1.py` only emits that local path (or
the no-photo fallback). The app never hotlinks Maps or a venue website, so a source
site outage cannot remove an image from Niklo. It is idempotent and only fetches
changed sources:

```bash
PHOTOS_DIR=../web/public/venues uv run python photos.py
python refresh_seed_media.py                # refresh local media and approved exclusions
```

`pipeline/transform/seeds/photo_source_overrides.csv` supplies a verified source for
any manually corrected venue image. It is only used to refresh the downloaded cache. R2 remains an
optional copy of the same files for a later deployment, not a public data dependency.

**Deploying to Cloudflare** (one-time): `wrangler login`, `wrangler d1 create niklo`,
drop the returned id into `web/wrangler.jsonc`, run the schema/seed with `--remote`,
then `npm run deploy`.

## status

The whole taxonomy is now scraped, cleaned and live: around 600 venues across five
groups, sports & active, entertainment, creative & chill, outdoors & adventure and
culture, covering padel, box cricket, futsal, tennis, squash, swimming, bowling, snooker,
arcades, cinemas, escape rooms, shisha, board-game and paint cafes, pottery and art
studios, jam rooms, cooking classes, beaches, parks, boating, museums and galleries,
heritage sites and more. A venue can sit in several at once, so a sports complex shows up
under both padel and futsal but stays a single result in search and on its own page.
Browse has open-now and area filters, you can save a shortlist, share it as a link, and
spin the wheel (the whole city, or just your shortlist) to settle it. Next up: the
Cloudflare deploy to put it online.
