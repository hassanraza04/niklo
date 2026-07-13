# Niklo Data

Tracked files in this directory are deliberate inputs or release locks:

- `live_listings.csv` is the public listing lock generated from the D1 seed.
- `search_regressions.csv` supports the customer-flow release checks.
- `review_resolutions.csv` records final owner decisions made after a review.

Generated daily reports and rare discovery candidates are intentionally ignored by
Git. Safe, exact-match daily facts are written to the seed and live listing lock;
anything riskier stays in the local report until a human approves it.
