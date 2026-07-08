# Niklo Web

Next.js app for the Niklo Karachi activity directory. It reads venue data from Cloudflare D1 through OpenNext, with local D1 support through Wrangler.

## Local Setup

From this folder:

```bash
npm ci
npm run db:schema
npm run db:seed
npm run dev
```

Then open `http://localhost:3000`.

## Checks

```bash
npm run lint
npm run build
```

Data guardrails live one level up:

```bash
cd ..
python3 pipeline/seed_checks.py
python3 -m unittest discover -s tests -v
```

## Production Notes

- `NEXT_PUBLIC_SITE_URL` controls sitemap and robots URLs.
- `wrangler.jsonc` needs the real D1 database id before deployment.
- Remote schema, remote seed, and Cloudflare deploy are handled outside this pre-deploy hardening pass.

## Key Routes

- `/`
- `/search`
- `/c/[category]`
- `/c/[category]/[subcategory]`
- `/v/[slug]`
- `/spin`
- `/saved`
- `/plan?v=slug-a,slug-b`

