# Niklo Web

The Next.js application for Niklo. It serves the generated public catalog as static files
through Cloudflare's CDN. D1 remains a reviewed seed export and validation source, not a
runtime dependency of the deployed site.

OpenNext stores prerendered public pages in its read-only Static Assets incremental cache.
Cache interception serves those entries before NextServer loads. The contact page and
`/api/contact` remain dynamic for Turnstile verification and email delivery.

## Local Setup

From this folder:

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000`.

After `infra/d1/seed.sql` changes, regenerate the static catalog before testing:

```bash
cd ..
python pipeline/export_catalog.py
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
- Cloudflare provisioning is manual. See the root [launch checklist](../docs/operations/launch-checklist.md).

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
