# Contributing to Niklo

Niklo is a public-facing directory, so small changes can affect real plans. Keep pull
requests narrow and explain any public data change.

## Product and data rules

- Do not add a new venue straight to `data/live_listings.csv` or the D1 seed.
- Use rare discovery to create candidates, then record the evidence and a manual approval
  before adding a place to the live listing lock.
- The daily refresh flow updates existing listings only.
- Keep venue photos downloaded under `web/public/venues`. Do not add a hotlinked image to
  public data.
- Preserve the five-review floor unless the project owner explicitly changes it.

## Before opening a pull request

```bash
cd web
npm run test:unit
npm run lint
npm run build

cd ..
pipeline/.venv/bin/python -m unittest discover -s tests -v
pipeline/.venv/bin/python pipeline/seed_checks.py
pipeline/.venv/bin/python pipeline/customer_flow_checks.py
pipeline/.venv/bin/python pipeline/release_checks.py
```

For data changes, also read [the update runbook](docs/operations/update-runbook.md) and
include the evidence used for the decision.
