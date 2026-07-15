# Data Update Runbook

Niklo has two intentionally separate data workflows. Neither can silently publish a new listing.

Niklo builds the public catalog from `infra/d1/seed.sql`. D1 is a reviewed data export and validation source, not a runtime dependency of the deployed site.

## Daily Safe Refresh

This workflow runs nightly at 2:00 AM Karachi time through GitHub Actions. It refreshes a deterministic batch of existing listings. It uses the existing Maps place id as the safety boundary, so a returned place can only update Niklo when it is already in the live listing lock.

```bash
pipeline/daily_refresh.sh
```

The default batch is 15 listings, which rotates through the allowlist in roughly 31 days while staying within the GitHub runner time limit. Each exact lookup is shallow and has a two-minute ceiling, so a slow Maps response cannot cancel the entire job. Override the batch size only when you are ready for a longer scrape.

An empty scrape fails the job and still keeps its artifact. A batch can never be marked verified when the scraper did not return any Maps rows.

```bash
DAILY_BATCH_SIZE=30 pipeline/daily_refresh.sh
```

For a local run, review `data/verification/YYYY-MM-DD/`. For the scheduled run, download the `daily-refresh-<run id>` artifact from the GitHub Actions job:

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

The daily job updates only ratings, review counts, hours, phone numbers, websites, and the source-check timestamp for exact existing matches. It rewrites `infra/d1/seed.sql`, refreshes `data/live_listings.csv`, and regenerates `web/data/catalog.json` and `web/public/catalog-client.json`. The scheduled workflow commits those safe generated updates to `main`, so the Cloudflare Git build can publish them.

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

After reviewing a daily report or a discovery candidate, make the approved curation changes, then run the full build. A full rebuild is not needed for routine safe daily facts because the daily command already updates the seed and static catalog files.

For an approved removal or subcategory correction, update the appropriate curation CSV under
`pipeline/transform/seeds/`, then apply those controls to the reviewed seed and generated catalog:

```bash
python pipeline/apply_manual_curation.py
```

This also refreshes each listing's local image path from the downloaded photo cache, so there is no separate media rebuild command.

Run `./run.sh` when the raw scrape inputs are available and the wider data model also needs rebuilding.

```bash
cd pipeline
./run.sh
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
