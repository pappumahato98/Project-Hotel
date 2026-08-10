#!/usr/bin/env bash
# Wrapper for Prisma CLI — loads DATABASE_URL from .env and passes it inline
# to bypass Prisma's buggy .env URL parser (fails with URL-encoded passwords).
#
# Usage:
#   bash scripts/prisma-local.sh db push
#   bash scripts/prisma-local.sh migrate deploy
#   bash scripts/prisma-local.sh generate
#
# In production (Vercel/Render), env vars are set directly — this issue doesn't exist.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo '❌ .env not found' >&2; exit 1
fi

# Read DATABASE_URL from .env (handles comments and inline values)
DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | sed 's/^DATABASE_URL=//' | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")

if [ -z "$DATABASE_URL" ]; then
  echo '❌ DATABASE_URL not found in .env' >&2; exit 1
fi

export DATABASE_URL
exec npx prisma "$@"