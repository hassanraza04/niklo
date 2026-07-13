# Data Update Runbook

Niklo has two intentionally separate data workflows. Neither can silently publish a new listing.

## Daily Safe Refresh

This workflow refreshes a deterministic batch of existing listings. It uses the existing Maps place id as the safety boundary, so a returned place can only update Niklo when it is already in the live listing lock.

```bash
pipeline/daily_refresh.sh
```

The default batch is 50 listings, which rotates through the allowlist in roughly ten days. Override the batch size only when you are ready for a longer scrape.

```bash
DAILY_BATCH_SIZE=75 pipeline/daily_refresh.sh
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
- `report/applied_safe_updates.csv`: safe public facts applied to the seed
- `report/pending_review_changes.csv`: risky changes held for manual review
- `report/applied_summary.md`: daily update totals

The daily job updates only ratings, review counts, hours, phone numbers, websites, and the source-check timestamp for exact existing matches. It rewrites `infra/d1/seed.sql`, refreshes `data/live_listings.csv`, and reloads the local preview database.

It does not deploy, write to remote Cloudflare D1, add a new place, or automatically accept a name, address, coordinate, category, status, or closure change. Those changes remain in `pending_review_changes.csv` for a manual decision.

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

## Approved Curation Rebuild

After reviewing a daily report or a discovery candidate, make the approved curation changes, then run the full build and refresh the local preview database. A full rebuild is not needed for routine safe daily facts because the daily command already updates the seed and local preview.

```bash
cd pipeline
./run.sh
cd ../web
npm run db:reset
```

Finish with the release checks:

```bash
pipeline/.venv/bin/python pipeline/seed_checks.py
pipeline/.venv/bin/python pipeline/customer_flow_checks.py
pipeline/.venv/bin/python pipeline/release_checks.py
pipeline/.venv/bin/python -m unittest discover -s tests -v
```

## Manual Approval Required

- Record a final owner decision in `data/review_resolutions.csv` when it resolves a prior review concern.
- A venue looks closed or disappeared from refresh.
- A venue changed name, address, location, category, or status.
- A venue lost both phone and website.
- A new `place_id` appears in either report.
- A candidate is being considered for the public directory.
