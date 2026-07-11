#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
npx wrangler d1 execute niklo --local --command "drop table if exists venues"
npm run db:schema
npm run db:seed
npx wrangler d1 execute niklo --local --file=../infra/d1/flags.sql
echo "Local D1 reloaded from the current seed."
