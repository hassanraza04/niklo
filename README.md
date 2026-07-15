# Niklo

Live site: [niklo.nikloapp.workers.dev](https://niklo.nikloapp.workers.dev)

**Niklo is a carefully cleaned guide to making plans in Karachi.** It brings sport,
screens, games, parks, culture, and other good options into one browsable directory.

The project is intentionally opinionated about data quality. It favours real places
with enough public evidence, removes duplicates and poor imports, keeps images locally
cached, and makes it easy to find options by type, rating, popularity, and distance.

## What visitors can do

- Browse a curated Karachi directory by type.
- Search venues, areas, and categories without noisy matches leading the results.
- See ratings, opening information, saved places, maps, and optional distance from a
  device location or a familiar landmark.
- Build a shortlist, share it, or let the spin wheel settle a group decision.

## How it is built

```text
public listing data -> local scraper -> DuckDB + dbt cleanup -> D1 seed -> static catalog files -> CDN
```

- `web/` contains the Next.js application, generated static catalog files, and cached venue images.
- `pipeline/` loads, cleans, validates, and exports the public venue dataset.
- `scraper/` holds the query sets used for deliberate local collection runs.
- `infra/d1/` contains the reproducible D1 schema and generated seed used to validate and export the catalog.
- `data/` stores the live-listing lock, search regressions, and review outputs.
- `docs/operations/update-runbook.md` explains the active listing-update workflows.

Niklo uses public business facts such as venue names, addresses, hours, ratings, and
review counts. It does not rehost review text. Images served by the app are downloaded
into the repository rather than hotlinked from Maps or venue websites.

The public catalog is generated from `infra/d1/seed.sql` into static files that Cloudflare
serves from the CDN. OpenNext serves its prerendered public pages from a read-only Static
Assets incremental cache and intercepts those cache hits before loading NextServer. The
contact page and `/api/contact` remain dynamic so Turnstile can verify submissions and the
site can deliver email. D1 is a reviewed data export and validation source, not a runtime
dependency of the deployed site.

## Run locally

Requirements: Node.js 22+, Python 3.12+, and [uv](https://docs.astral.sh/uv/).

```bash
cd web
npm ci
npm run dev
```

Open the local URL printed by Next. It normally uses `http://localhost:3000`, but it will choose another available port when `3000` is already in use.

To run the pipeline checks from a fresh clone, create its managed environment once:

```bash
cd pipeline
uv sync
cd ..
```

## Verify a change

```bash
# web
cd web
npm run test:unit
npm run lint
npm run build

# data and pipeline
cd ..
pipeline/.venv/bin/python -m unittest discover -s tests -v
pipeline/.venv/bin/python pipeline/seed_checks.py
pipeline/.venv/bin/python pipeline/customer_flow_checks.py
pipeline/.venv/bin/python pipeline/release_checks.py
```

GitHub Actions runs the same public-data and web-build checks for pushes and pull
requests. Commits to `main` publish reviewed listing updates through the Cloudflare build,
which serves the generated catalog from the CDN.

## Runtime configuration

Set `NEXT_PUBLIC_SITE_URL` as a Cloudflare build variable so static URLs use the live
hostname. The contact form uses Worker runtime bindings: `RESEND_API_KEY` and
`TURNSTILE_SECRET_KEY` are secrets, while `RESEND_FROM_EMAIL` and `TURNSTILE_SITE_KEY`
are normal variables. Keep all of them out of Git. Do not put contact-form values in
Cloudflare build variables.

## Data operations

Niklo has two separate workflows by design:

1. **Daily refresh** checks a rotating batch of existing listings and updates safe
   facts for exact Maps matches. It never publishes a new place automatically, and
   identity, location, category, and status changes stay in review.
2. **Rare discovery** produces a separate candidate queue. Every candidate needs manual
   evidence review before it can join the live listing lock.

Read [the update runbook](docs/operations/update-runbook.md) before touching public
data. Safe updates and approved curation changes are committed to `main`, where the
Cloudflare Git build publishes the updated static catalog.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). The short version: keep changes scoped,
run the relevant checks, do not add new venues directly to the public dataset, and do
not add external photo hotlinks to the app.

Security reports are covered by [SECURITY.md](SECURITY.md).
