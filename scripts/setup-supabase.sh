#!/usr/bin/env bash
#
# setup-supabase.sh — Interactive Supabase + JWT credentials setup
#
# Prompts for 2 required values (DATABASE_URL + JWT_SECRET),
# validates them, writes to .env, pushes Prisma schema,
# and sets the admin password.
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
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Meridian PMS — Supabase + JWT Setup                    ║${RESET}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "You need a Supabase project. If you don't have one yet:"
echo "  1. Go to https://supabase.com → Sign up (GitHub login is fastest)"
echo "  2. Click 'New Project' → name it 'meridian-pms' → set a DB password"
echo "  3. Wait ~90s for provisioning, then come back here."
echo ""
echo "This script will ask for ${CYAN}2 values${RESET}. Press Enter to accept the [current] value."
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
      display=" [current: ${current:0:60}]"
    fi
  elif [ -n "$default" ]; then
    display=" [default: ${default:0:60}]"
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

# ── Collect DATABASE_URL ────────────────────────────────────────────
echo -e "${BOLD}━━━ 1/2  DATABASE_URL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "  Dashboard → Settings → Database → Connection string → URI tab"
echo "  → Use the ${CYAN}Transaction pooler${RESET} (port 5432 or 6543)."
echo "  → Append: ${DIM}?pgbouncer=true&connection_limit=7&connect_timeout=15&pool_timeout=15${RESET}"
echo ""
DATABASE_URL=$(read_value \
  "  Paste connection string" "DATABASE_URL" "" \
  "^postgresql://|^postgres://" "Must start with postgresql:// or postgres://")

# ── Collect JWT_SECRET ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ 2/2  JWT_SECRET ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Used to sign HS256 access tokens. ${AMBER}Keep this secret!${RESET}"
echo "  Generate one: ${DIM}node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"${RESET}"
echo -e "  Or press Enter to ${CYAN}auto-generate${RESET} a new one."
echo ""

# Read or auto-generate JWT_SECRET
JWT_CURRENT=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | sed "s|^JWT_SECRET=||" || true)
if [ -n "$JWT_CURRENT" ]; then
  JWT_DISPLAY=" [current: ${JWT_CURRENT:0:12}...]"
else
  JWT_DISPLAY=""
fi

read -r -s -p "  Paste or press Enter to auto-generate${JWT_DISPLAY}: " JWT_INPUT
echo ""

if [ -z "$JWT_INPUT" ] && [ -z "$JWT_CURRENT" ]; then
  # Auto-generate
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
  echo -e "  ${GREEN}✓ Auto-generated: ${JWT_SECRET:0:20}...${RESET}"
elif [ -z "$JWT_INPUT" ]; then
  JWT_SECRET="$JWT_CURRENT"
else
  JWT_SECRET="$JWT_INPUT"
fi

# ── Write to .env ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Writing to ${ENV_FILE} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

# Ensure PgBouncer params are present in DATABASE_URL
if ! echo "$DATABASE_URL" | grep -q 'pgbouncer=true'; then
  if echo "$DATABASE_URL" | grep -q '\?'; then
    DATABASE_URL="${DATABASE_URL}&pgbouncer=true&connection_limit=7&connect_timeout=15&pool_timeout=15"
  else
    DATABASE_URL="${DATABASE_URL}?pgbouncer=true&connection_limit=7&connect_timeout=15&pool_timeout=15"
  fi
  echo -e "  ${CYAN}+${RESET} Appended PgBouncer params to DATABASE_URL"
fi

TMP=$(mktemp)
# Write fresh .env with only what we need
{
  echo "# ─── Database (Supabase PostgreSQL) ─────────────────────────"
  echo "DATABASE_URL=${DATABASE_URL}"
  echo ""
  echo "# ─── JWT Auth ──────────────────────────────────────────────"
  echo "# DO NOT share. Used to sign HS256 access tokens (jose library). Change if compromised."
  echo "JWT_SECRET=${JWT_SECRET}"
} > "$TMP"
mv "$TMP" "$ENV_FILE"

echo -e "  ${GREEN}✓${RESET} DATABASE_URL = ${DATABASE_URL:0:40}..."
echo -e "  ${GREEN}✓${RESET} JWT_SECRET  = ${JWT_SECRET:0:20}... (${#JWT_SECRET} chars)"
echo ""

# ── Push Prisma schema to Postgres ───────────────────────────────────
echo -e "${BOLD}━━━ Pushing Prisma schema to Postgres ━━━━━━━━━━━━━━━━━━━━━${RESET}"
if npx prisma db push --accept-data-loss 2>&1; then
  echo -e "  ${GREEN}✓ Schema synced (tables + indexes)${RESET}"
else
  echo -e "  ${RED}✗ Schema push failed. Check your DATABASE_URL and DB password.${RESET}"
  exit 1
fi
echo ""

# ── Set admin password ──────────────────────────────────────────────
echo -e "${BOLD}━━━ Setting admin password ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Default admin password: ${CYAN}Admin@123${RESET}"
echo -e "  ${DIM}(Change after first login via Profile → Change Password)${RESET}"
echo ""

if [ -f "db/set-admin-password.mjs" ]; then
  if node db/set-admin-password.mjs 2>&1; then
    echo -e "  ${GREEN}✓ Admin password set${RESET}"
  else
    echo -e "  ${AMBER}⚠ Password script failed — you may need to set it manually.${RESET}"
    echo -e "  Run: ${DIM}node db/set-admin-password.mjs [email] [password]${RESET}"
  fi
else
  echo -e "  ${AMBER}⚠ db/set-admin-password.mjs not found — skipping${RESET}"
fi
echo ""

# ── Done ─────────────────────────────────────────────────────────────
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║   ✓ Setup complete!                                         ║${RESET}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Login: ${CYAN}admin@meridian.com${RESET} / ${CYAN}Admin@123${RESET}"
echo ""
echo "  Deploy to Vercel:  ${DIM}bash scripts/setup-vercel-env.sh${RESET}"
echo "  Deploy to Render:   ${DIM}https://dashboard.render.com/blueprints${RESET}"
echo ""
