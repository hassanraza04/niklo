# Marksman Arena Investigation

## Outcome

The Marksman Arena was not missed by the scraper. Its Google place id,
`ChIJybTEzTw7sz4RLb2PysKPyv0`, was deliberately added to
`excluded_venues.csv` in commit `5a96058` on 2026-06-29. The exclusion happened
before it could enter the generated D1 seed.

The current venue is open and publicly bookable. Its official site lists neon
paintball and indoor cricket as live activities, plus an exact Korangi Creek
address, phone number, hours, and an embedded map at `24.8100723, 67.121498`.
It also lists bowling, laser tag, RC racing, and padel as coming soon, so those
are not assigned to the listing.

Sources:

- [Marksman Arena home](https://marksman.pk/)
- [Marksman Arena contact page](https://marksman.pk/contact.html)

## Fix

- Removed the incorrect exclusion.
- Added a reviewed fallback record in `curated_venues.csv` so a future full build
  preserves the listing even if the raw scrape is temporarily unavailable.
- Added the venue to both Paintball and Box Cricket refresh queries. The
  `paintball` primary override keeps the public breadcrumb accurate.
- Added it to `data/live_listings.csv`. Routine verification can now refresh its
  facts but still cannot introduce unrelated new place ids.
- Added tests that lock the venue into the public seed and stop curated ids from
  being excluded again.

## Scope

There are 584 entries in `excluded_venues.csv`. Most are correctly excluded as
noise, closed places, private clubs, duplicates, or activities outside Niklo's
taxonomy. The concern is limited to a legacy reviewed batch: 45 entries use a
`verified:` reason, and at least the following 15 describe an activity Niklo now
has a live category for. They are candidates for a separate current-status review,
not automatic additions.

| Candidate | Likely live category |
| --- | --- |
| English Snooker Club | Billiards & Snooker |
| SUPERGAME Karachi | Billiards & Snooker |
| Dreamers Arena | Box Cricket or Futsal |
| XL Snooker Club | Billiards & Snooker |
| Power Hitter Indoor Sports Arena | Box Cricket |
| ROG Gaming Zone | Arcades & Gaming Lounges |
| FreeHit Indoor | Box Cricket or Futsal |
| Indoor Sports Arena | Box Cricket or Futsal |
| Cover Drive | Box Cricket |
| Net Cricket | Box Cricket |
| Smashers Cricket | Box Cricket |
| Battlestation | Laser Tag |
| Lyari fun zone | Billiards & Snooker |
| C.B.R Snooker & Patti Gaming | Billiards & Snooker |
| The Edge Gaming zone | Box Cricket |

The list also contains genuine scope exclusions such as full golf courses,
members-only clubs, private facilities, children's play areas, commercial malls,
and sports that do not yet have a Niklo category. Those should remain excluded
unless the product taxonomy changes.

## Follow-up Rule

When a curated review finds a public venue that matches an existing Niklo
subcategory, add it through `curated_venues.csv` or restore its normal scraped
row. Do not place it in `excluded_venues.csv` simply because it is multi-activity
or was first found by the wrong search query.

