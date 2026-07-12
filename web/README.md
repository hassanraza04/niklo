# Niklo Web

The Next.js application for Niklo. It reads the generated venue seed through Cloudflare
D1 in production and Wrangler's local D1 emulator during development.

## Local Setup

From this folder:

```bash
npm ci
npm run db:reset
npm run dev
```

Then open `http://localhost:3000`.

After `infra/d1/seed.sql` changes, reset the local database before testing:

```bash
npm run db:reset
```

## Checks

```bash
npm run lint
npm run test:unit
npm run build
```

Data guardrails live one level up:

```bash
cd ..
python3 pipeline/seed_checks.py
python3 pipeline/customer_flow_checks.py
python3 pipeline/release_checks.py
python3 -m unittest discover -s tests -v
```

## Production Notes

- `NEXT_PUBLIC_SITE_URL` controls sitemap and robots URLs.
- `wrangler.jsonc` needs the real D1 database id before deployment.
- Cloudflare provisioning, remote seeding, and deployment are manual. See the root
  [launch checklist](../docs/operations/launch-checklist.md).

## Key Routes

- `/`
- `/search`
- `/c/[category]`
- `/c/[category]/[subcategory]`
- `/v/[slug]`
- `/spin`
- `/saved`
- `/plan?v=slug-a,slug-b`
