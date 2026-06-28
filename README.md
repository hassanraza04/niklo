# Niklo

A homey little directory of things to do in Karachi besides eat — padel, cinemas,
bowling, escape rooms, arcades, hikes, all that. Browse by category, filter by area,
and when you genuinely can't decide, spin the wheel.

It started as a real itch (me and my friends hang out constantly and always end up
eating because we can't think of anything else), and turned into a nice excuse to
build a proper data pipeline end to end.

> Working name "Activit", going with **Niklo** (Urdu — "let's head out").

## how it works

```
google maps  ──gosom──▶  raw json  ──dlt──▶  duckdb  ──dbt──▶  dim_venue  ──▶  cloudflare d1  ──▶  next.js
  (scrape)                (per query)         (raw)    (dedupe)  (canonical)      (sqlite)         (the site)
```

1. **Scrape** — `gosom/google-maps-scraper`, run locally off my Karachi home line so
   the geo comes back correct (see `docs/part-c-ip-test.md` for why, and the safe
   concurrency/pacing I landed on). One query per run, low concurrency, pauses between.
2. **Pipeline** — `dlt` loads the scrape json into DuckDB, then `dbt` does the entity
   resolution: dedupe on Google's `place_id`, a name+geo fallback for the rare rows
   missing one, clip to the Karachi bbox, map to my taxonomy → `dim_venue`.
3. **Serve** — `dim_venue` gets pushed into Cloudflare D1; the Next.js app reads it.

Only thing kept from Google is the rating + review count (plus the public facts —
hours, phone, location). No review text rehosted; venue pages link out to Maps.

## the stack

- **Scrape:** gosom (native arm64 binary — the docker image is amd64 and its chromium
  dies under emulation on Apple silicon)
- **Pipeline:** Python, dlt → dbt → DuckDB
- **App:** Next.js (App Router) + Tailwind, on Cloudflare via OpenNext
- **Data:** Cloudflare D1 (venues), R2 later for first-party photos

## layout

```
scraper/     gosom query files + run.sh (one query) + sweep.sh (a whole category)
pipeline/    dlt loader, dbt project (stg -> int -> dim_venue), export to d1
infra/d1/    d1 schema + generated seed
web/         next.js app
data/        taxonomy + the padel ground-truth list used to measure recall
docs/        the ip-test writeup
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

**Deploying to Cloudflare** (one-time): `wrangler login`, `wrangler d1 create niklo`,
drop the returned id into `web/wrangler.jsonc`, run the schema/seed with `--remote`,
then `npm run deploy`.

## status

Padel is fully scraped, cleaned and live (122 venues). The pipeline is parameterised
by category, so the rest of the taxonomy is just more sweeps. Next up: more categories,
open-now filters, and saving/sharing shortlists with friends.
