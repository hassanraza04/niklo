# Niklo Pre-Deploy Checklist

Use this before the Cloudflare deploy. Cloudflare account setup, D1 ids, remote seeding, and final deploy are intentionally separate.

## Data

- Run `python3 pipeline/export_live_listings.py`.
- Run `python3 pipeline/seed_checks.py`.
- Run `python3 pipeline/customer_flow_checks.py`.
- Run `python3 pipeline/release_checks.py`.
- Confirm `data/live_listings.csv` has the same count as `infra/d1/seed.sql`.
- Confirm `infra/d1/flags.sql` has no unexpected active flags.
- Check the two deferred listing decisions when you are ready:
  - `CS ARENA`
  - `KICK OFF indoor`

## App

- Run `cd web && npm ci`.
- Run `npm run lint`.
- Run `npm run build`.
- Check these pages locally:
  - `/`
  - `/search?q=padel`
  - `/c/sports-active`
  - `/c/sports-active/padel`
  - one venue page from the current seed
  - `/spin`
  - `/saved`
  - `/sitemap.xml`
- `/robots.txt`

## Local Preview

- After changing `infra/d1/seed.sql`, run `cd web && npm run db:reset` before testing.
- Search for `marksman`, `english snooker`, and `edge gaming` to confirm exact venue matches lead.
- Confirm a removed low-review listing does not resolve to a venue page.

## Content

- Confirm the homepage copy still matches the live taxonomy.
- Confirm `web/README.md` has current local setup instructions.
- Confirm `README.md` still matches the latest pipeline.

## Production Handoff

- Set `NEXT_PUBLIC_SITE_URL` to the real site URL before production.
- After Cloudflare is configured, run the remote D1 schema and seed from the README.
- After deploy, run the same page checks against the live URL.
