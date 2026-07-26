#!/usr/bin/env bash
#
# setup-supabase.sh — Interactive Supabase credentials setup
#
# Prompts for the 4 required values, validates them, writes to .env,
# pushes the Prisma schema to Postgres, seeds demo users, and restarts
# the dev server.
#
# Run:  bash scripts/setup-supabase.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env"
BOLD='\033[1m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Meridian PMS — Supabase Setup                          ║${RESET}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "You need a Supabase project. If you don't have one yet:"
echo "  1. Go to https://supabase.com → Sign up (GitHub login is fastest)"
echo "  2. Click 'New Project' → name it 'meridian-pms' → set a DB password"
echo "  3. Wait ~90s for provisioning, then come back here."
echo ""
echo "This script will ask for 4 values. Press Enter to accept the [current] value."
echo ""

# ── Helper: read a value with optional default and validation ─────────
read_value() {
  local prompt="$1"
  local key="$2"
  local default="$3"
  local validate_regex="$4"
  local validate_msg="$5"
  local is_secret="${6:-no}"

  local current=""
  current=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | sed "s|^${key}=||" || true)

  local display=""
  if [ -n "$current" ]; then
    if [ "$is_secret" = "yes" ]; then
      display=" [current: ${current:0:12}...]"
    else
      display=" [current: ${current:0:50}]"
    fi
  elif [ -n "$default" ]; then
    display=" [default: ${default:0:50}]"
  fi

  local value=""
  while true; do
    if [ "$is_secret" = "yes" ]; then
      read -r -s -p "${prompt}${display}: " value
      echo ""
    else
      read -r -p "${prompt}${display}: " value
    fi
    value="${value:-${current:-$default}}"
    if [ -z "$value" ]; then
      echo -e "  ${RED}✗ Value is required.${RESET}"
      continue
    fi
    if [ -n "$validate_regex" ] && ! echo "$value" | grep -qE "$validate_regex"; then
      echo -e "  ${RED}✗ ${validate_msg}${RESET}"
      continue
    fi
    echo "$value"
    return 0
  done
}

# ── Collect the 4 values ────────────────────────────────────────────
echo -e "${BOLD}━━━ 1/4  DATABASE_URL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "  Dashboard → Settings → Database → Connection string → URI tab"
echo "  → Transaction pooler (port 6543). Replace [YOUR-PASSWORD] with"
echo "  the DB password you set when creating the project."
echo ""
DATABASE_URL=$(read_value \
  "  Paste connection string" "DATABASE_URL" "" \
  "^postgresql://|postgres://" "Must start with postgresql:// or postgres://")

echo ""
echo -e "${BOLD}━━━ 2/4  NEXT_PUBLIC_SUPABASE_URL ━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "  Dashboard → Settings → API → Project URL"
echo ""
NEXT_PUBLIC_SUPABASE_URL=$(read_value \
  "  Paste project URL" "NEXT_PUBLIC_SUPABASE_URL" "" \
  "^https://.*supabase\.co" "Must look like https://xxxxx.supabase.co")

echo ""
echo -e "${BOLD}━━━ 3/4  NEXT_PUBLIC_SUPABASE_ANON_KEY ━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "  Dashboard → Settings → API → Project API keys → 'anon public'"
echo ""
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(read_value \
  "  Paste anon key" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "" \
  "^eyJ" "Must start with eyJ (a JWT)")

echo ""
echo -e "${BOLD}━━━ 4/4  SUPABASE_SERVICE_ROLE_KEY ━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "  Dashboard → Settings → API → Project API keys → 'service_role'"
echo -e "  ${AMBER}(keep this secret — it bypasses RLS)${RESET}"
echo ""
SUPABASE_SERVICE_ROLE_KEY=$(read_value \
  "  Paste service role key" "SUPABASE_SERVICE_ROLE_KEY" "" \
  "^eyJ" "Must start with eyJ (a JWT)" "yes")

# ── Write to .env ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Writing to ${ENV_FILE} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

# Preserve any comments / structure; just update the 4 keys.
# Using a temp file + sed for atomic update.
TMP=$(mktemp)
while IFS= read -r line; do
  case "$line" in
    DATABASE_URL=*)            echo "DATABASE_URL=${DATABASE_URL}" ;;
    NEXT_PUBLIC_SUPABASE_URL=*)      echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" ;;
    NEXT_PUBLIC_SUPABASE_ANON_KEY=*) echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" ;;
    SUPABASE_SERVICE_ROLE_KEY=*)     echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}" ;;
    *) echo "$line" ;;
  esac
done < "$ENV_FILE" > "$TMP"
mv "$TMP" "$ENV_FILE"

echo -e "  ${GREEN}✓${RESET} DATABASE_URL            = ${DATABASE_URL:0:30}..."
echo -e "  ${GREEN}✓${RESET} NEXT_PUBLIC_SUPABASE_URL      = ${NEXT_PUBLIC_SUPABASE_URL}"
echo -e "  ${GREEN}✓${RESET} NEXT_PUBLIC_SUPABASE_ANON_KEY = ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
echo -e "  ${GREEN}✓${RESET} SUPABASE_SERVICE_ROLE_KEY     = ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# ── Push Prisma schema to Postgres ───────────────────────────────────
echo -e "${BOLD}━━━ Pushing Prisma schema to Postgres ━━━━━━━━━━━━━━━━━━━━━${RESET}"
if bunx prisma db push --accept-data-loss; then
  echo -e "  ${GREEN}✓ Tables created${RESET}"
else
  echo -e "  ${RED}✗ Schema push failed. Check your DATABASE_URL and DB password.${RESET}"
  exit 1
fi
echo ""

# ── Seed demo data ───────────────────────────────────────────────────
echo -e "${BOLD}━━━ Seeding demo data (Supabase Auth users + hotel) ━━━━━━━${RESET}"
if bunx tsx scripts/vercel-seed.ts; then
  echo -e "  ${GREEN}✓ Seed complete${RESET}"
else
  echo -e "  ${RED}✗ Seed failed. Check the error above.${RESET}"
  exit 1
fi
echo ""

# ── Done ─────────────────────────────────────────────────────────────
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║   ✓ Supabase setup complete!                              ║${RESET}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "Next: restart the dev server and log in at the Preview Panel."
echo "  Demo login: admin@meridian.com / password123"
echo ""
