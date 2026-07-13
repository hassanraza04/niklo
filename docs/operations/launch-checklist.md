# Niklo Launch Checklist

Use this before a manual Cloudflare deployment. Cloudflare account setup, D1 ids, remote
seeding, and the final deploy stay separate from this repository check.

## Data

- Run `python3 pipeline/export_live_listings.py`.
- Run `python3 pipeline/seed_checks.py`.
- Run `python3 pipeline/customer_flow_checks.py`.
- Run `python3 pipeline/release_checks.py`.
- Confirm `data/live_listings.csv` has the same count as `infra/d1/seed.sql`.
- Confirm `data/review_resolutions.csv` reflects any manual decisions made since the last build.

## App

- Run `cd web && npm ci`.
- Run `npm run lint`.
- Run `npm run build`.
- Check these pages locally:
  - `/`
  - `/search?q=cinema`
  - `/c/sports-active`
  - `/c/entertainment`
  - one venue page from the current seed
  - `/spin`
  - `/saved`
  - `/map`
  - `/data`
  - `/sitemap.xml`
- `/robots.txt`

## Local Preview

- After changing `infra/d1/seed.sql`, run `cd web && npm run db:reset` before testing.
- Search for the regression cases in `data/search_regressions.csv` to confirm exact venue matches lead.
- Confirm a removed low-review listing does not resolve to a venue page.

## Content

- Confirm the homepage copy and footer links match the live taxonomy.
- Confirm the root README and `web/README.md` match the current workflows.

## Production Handoff

- Set `NEXT_PUBLIC_SITE_URL` to the real site URL before production.
- Add `RESEND_API_KEY` as a Worker secret for the contact form. Keep it out of Git and
  browser-accessible variables.
- Set `RESEND_FROM_EMAIL` to a verified Resend sender before public launch.
- Create a managed Turnstile widget named `Niklo contact` for the live hostname `niklo.pk`.
- Add `TURNSTILE_SITE_KEY` as a public Worker runtime variable.
- Add `TURNSTILE_SECRET_KEY` as a Worker runtime secret.
- Do not add either Turnstile value to Cloudflare Settings > Build > Build Variables and Secrets.
- Review `compatibility_date` in `web/wrangler.jsonc` against Cloudflare's current guidance.
- After Cloudflare is configured, run the remote D1 schema and seed from the README.
- After deploy, run the same page checks against the live URL.
- Open `https://niklo.pk/contact` and submit a valid test message. Confirm the form reports
  success and the message arrives through the existing contact delivery path.
- Confirm `/api/contact` remains dynamic in the production bundle after the OpenNext build.
