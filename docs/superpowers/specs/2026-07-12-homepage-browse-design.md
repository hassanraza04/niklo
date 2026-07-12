# Homepage Browse Order

## Goal

Make the home page easier to scan and base its crowd signal on popularity rather than a small number of high ratings.

## Changes

- Put `Browse by type` directly after the hero.
- Put `Tonight: find something that fits` after category browsing.
- Remove the static `Niklo picks` block and its unused collection data.
- Keep `Crowd favourites`, but select entries by review count first and rating only as a tie-breaker.
- Change the supporting label to describe popularity accurately.

## Data And Tests

- Reuse the existing `topVenues` query with review-count-first ordering.
- Add a focused query test that protects popularity ordering.
- Add a home-page source test that protects the intended section order and the absence of `Niklo picks`.
