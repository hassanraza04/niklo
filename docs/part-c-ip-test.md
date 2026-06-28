# scraping from a karachi home line — what actually worked

Notes from setting up the gosom scrape and settling the "where do I run this from"
question before doing the big backfill. Padel was the guinea-pig category.

## the question

Google Maps geolocates search results by the requester's IP. Run the scrape from
a US CI box and you get US-skewed, low-recall results; run it from a Karachi
residential line and the geo is correct for free. I wanted to confirm that before
committing, and lock in concurrency/pacing that doesn't get the home IP soft-banned.

## environment

- Home connection: PK residential (AS9541 Cyber Internet Services, Sindh, Asia/Karachi). Good.
- gosom: the docker image is **amd64-only**, and its bundled chromium segfaults
  under qemu emulation on this M-series Mac (`SIGSEGV` in the qemu rcu code — not
  a Google block, the browser dies before it ever loads a page). Fix: run the
  **native arm64 binary** (`~/go/bin/google-maps-scraper`, v1.14) — native
  chromium, no emulation. That's what `run.sh` calls.
- gosom has **no delay/rate-limit flag**, so pacing has to happen between runs.
  `sweep.sh` runs one query per invocation with a 25–50s random pause between them,
  plus low `-c`.

## what I ran

Decided not to bother with the CI cells (A/B) — the whole point is the local IP,
and a US runner can't match a Karachi one on geo no matter what. Free proxies (E)
are a known dead end. So: cells C/D (home, with and without `-geo`) plus a real
sweep to stress concurrency.

| run | query | settings | result |
|-----|-------|----------|--------|
| smoke | `padel karachi` | depth 3, `-c 1`, `-geo` | 40 results, **100% inside Karachi bbox**, 0 captcha |
| full sweep | 6 padel queries (synonyms + DHA/Clifton) | depth 10, `-c 2`, 25–50s pauses | 429 raw rows, 0 soft-bans, 0 empty drops |

## numbers (full padel sweep, `analyze.py`)

- 429 raw rows → **127 unique `place_id`s** → **122 inside the Karachi bbox** (96% — 5 spillover rows dropped)
- **127/127 have a rating + review count** (the two fields the product needs)
- **recall vs a hand-checked ground-truth list: 33/36 = 92%** (misses: Court X, and two low-confidence ones, Silk Arena / Club 44)

The single citywide query at depth 3 only hit ~47% recall on its own — it was the
synonyms + the DHA/Clifton neighbourhood passes that pulled the rest in. And the
sweep found ~90 padel venues that weren't even on the ground-truth list, so the
list was a floor, not a ceiling (Karachi's padel scene is growing fast).

## decisions locked in

- **Run locally, home IP, with `-geo 24.86,67.01 -lang en`.** This is the baseline.
- **`-c 2`, `-depth 10`,** one query per run via `sweep.sh` with 25–50s pauses. Held
  for 429 venues across 6 queries with zero blocks.
- Re-scrape ~monthly; diff `place_id`s to catch closures; refresh rating/review_count each run.

## honest caveats

- `padel karachi` alone came back with ~111 rows — close to Google's ~120 cap.
  For the very densest categories (cafés, gyms) I'll grid DHA/Clifton at 0.5km;
  padel was fine because the synonym + neighbourhood passes covered the tail.
- The broad set includes big multi-sport clubs (Gymkhana, DA Club, Creek Club).
  Most of those genuinely added padel courts, so they stay — curation trims the
  rest later.
- gosom breaks when Google changes their HTML. It's actively maintained, but budget
  for the occasional "update gosom" day.
