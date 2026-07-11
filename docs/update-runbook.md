# Data Update Runbook

Niklo has two intentionally separate data workflows. Neither can silently publish a new listing.

## Daily Safe Refresh

This workflow refreshes a deterministic small batch of existing listings. It does not run dbt, export a seed, change `data/live_listings.csv`, or write to D1.

```bash
pipeline/daily_refresh.sh
```

The default batch is 20 listings, which rotates through the allowlist over roughly a month. Override the batch size only when you are ready for a longer scrape.

```bash
DAILY_BATCH_SIZE=40 pipeline/daily_refresh.sh
```

Review `data/verification/YYYY-MM-DD/` after each run:

- `plan.md` and `batch.csv`: the existing listings selected for that day
- `report/summary.md`: refresh coverage
- `report/refreshed_known_rows.ndjson`: fresh Maps records for known place ids
- `report/ignored_new_place_ids.csv`: new ids quarantined from the daily workflow
- `report/missing_in_refresh.csv`: listings that did not return
- `report/changed_popularity.csv`: rating and review-count changes
- `report/changed_core_fields.csv`: name, phone, website, and address changes
- `report/possible_closed.csv`: Maps closures

The report is evidence for a later approved update. It changes no public data.

## Rare Discovery

Use discovery only when you deliberately want to look for potential new places. Provide a scrape-output directory from a broad, local Maps sweep.

```bash
pipeline/rare_discovery.sh scraper/out
```

Discovery uses its own DuckDB warehouse under `data/discovery/YYYY-MM-DD/`. It writes:

- `new_candidates.csv`: potential new listings, all marked `pending`
- `known_live_matches.csv`: discovered records already in the live allowlist
- `summary.md`: run counts and review reminder

It cannot export `infra/d1/seed.sql`, alter `data/live_listings.csv`, or reload D1. A candidate enters Niklo only after manual evidence review and an explicit curation change.

## Approved Public Data Rebuild

After reviewing a daily report or a discovery candidate, make the approved input changes, then run the full build and refresh the local preview database.

```bash
cd pipeline
./run.sh
cd ../web
npm run db:reset
```

Finish with the release checks:

```bash
python3 pipeline/seed_checks.py
python3 pipeline/customer_flow_checks.py
python3 pipeline/release_checks.py
python3 -m unittest discover -s tests -v
```

## Manual Approval Required

- A venue looks closed or disappeared from refresh.
- A venue changed name, location, category, phone, or website.
- A venue lost both phone and website.
- A new `place_id` appears in either report.
- A candidate is being considered for the public directory.
