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
pipeline/.venv/bin/python pipeline/seed_checks.py
pipeline/.venv/bin/python pipeline/customer_flow_checks.py
pipeline/.venv/bin/python pipeline/release_checks.py
pipeline/.venv/bin/python -m unittest discover -s tests -v
```

## Production Notes

- `NEXT_PUBLIC_SITE_URL` controls sitemap and robots URLs.
- `wrangler.jsonc` needs the real D1 database id before deployment.
- Add `RESEND_API_KEY` as a Cloudflare Worker secret for the contact form. Do not place it
  in `wrangler.jsonc` or commit it to Git.
- Set `RESEND_FROM_EMAIL` to a sender address verified in Resend. Until then, the form uses
  Resend's `onboarding@resend.dev` sender for account-owner testing.
- Create a managed Turnstile widget named `Niklo contact` for the live hostname `niklo.pk`.
- Add `TURNSTILE_SITE_KEY` as a public Worker runtime variable.
- Add `TURNSTILE_SECRET_KEY` as a Worker runtime secret.
- Do not add either Turnstile value to Cloudflare Settings > Build > Build Variables and Secrets.
- `npm run deploy` runs OpenNext and then Wrangler. `keep_vars: true` in `wrangler.jsonc`
  retains dashboard-managed Worker variables and secrets during that deployment. Keep their
  values out of Git and configure them in Cloudflare before the first deploy.
- Cloudflare provisioning and remote seeding are manual. See the root [launch
  checklist](../docs/operations/launch-checklist.md).

## Key Routes

- `/`
- `/search`
- `/map`
- `/c/[category]`
- `/c/[category]/[subcategory]`
- `/v/[slug]`
- `/spin`
- `/saved`
- `/plan?v=slug-a,slug-b`
- `/data`
- `/contact`
- `/privacy`
- `/terms`
