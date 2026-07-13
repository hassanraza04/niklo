# Niklo Data

Tracked files in this directory are deliberate inputs or release locks:

- `live_listings.csv` is the public listing lock generated from the D1 seed.
- `search_regressions.csv` supports the customer-flow release checks.
- `review_resolutions.csv` records final owner decisions made after a review.

Generated daily verification reports and rare discovery candidates are intentionally
ignored by Git. They stay local until a human approves a specific data change.
