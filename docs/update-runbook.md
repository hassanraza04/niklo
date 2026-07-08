# Existing Listings Update Runbook

Routine updates must refresh facts about current listings only. They must not add new listings.

## Principle

`data/live_listings.csv` is the allowlist. If a scraped `place_id` is not in that file, it is reported in `ignored_new_place_ids.csv` and does not enter production.

## Monthly Flow

1. Export the current allowlist.

```bash
python3 pipeline/export_live_listings.py
```

2. Run the usual local scrape from Karachi, using the existing query files.

```bash
cd scraper
./sweep.sh queries/padel.txt padel
```

Repeat for the categories you want to refresh.

3. Generate a verification report.

```bash
python3 pipeline/verify_existing.py
```

4. Review the generated files under `data/verification/YYYY-MM-DD/`.

- `summary.md`
- `refreshed_known_rows.ndjson`
- `ignored_new_place_ids.csv`
- `missing_in_refresh.csv`
- `changed_core_fields.csv`
- `changed_popularity.csv`
- `possible_closed.csv`

5. Apply only approved changes to the pipeline inputs or curation seeds.

6. Rebuild local data.

```bash
cd pipeline
./run.sh
```

7. Run guardrails again.

```bash
python3 pipeline/export_live_listings.py
python3 pipeline/seed_checks.py
python3 -m unittest discover -s tests -v
```

## Manual Approval Required

- A venue looks closed.
- A venue disappeared from refresh.
- A venue name changed.
- A venue moved.
- A venue changed category.
- A venue lost both phone and website.
- A new `place_id` looks interesting.

New place ids stay out of routine updates. Add them only through a separate curation pass.

