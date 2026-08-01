#!/usr/bin/env bash
# Vercel Environment Setup for Meridian PMS (JWT Auth)
#
# Sets 2 env vars: DATABASE_URL + JWT_SECRET
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel
#   - Supabase project with schema already pushed (prisma db push)
#   - Local .env populated (run scripts/setup-supabase.sh first)
#
# Usage:  bash scripts/setup-vercel-env.sh [environment...]
#         bash scripts/setup-vercel-env.sh                # → production preview development
#         bash scripts/setup-vercel-env.sh production     # → production only

set -euo pipefail
cd "$(dirname "$0")/.."

# ── Colors ───────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

# ── Which Vercel environments to target ──────────────────────────────
ENVS=("${@:-production preview development}")

# ── Banner ───────────────────────────────────────────────────────────
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Meridian PMS — Vercel Environment Setup (JWT Auth)     ║${RESET}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "Target environments: ${CYAN}${ENVS[*]}${RESET}"
echo ""

# ── Prerequisite checks ───────────────────────────────────────────────
if ! command -v vercel &>/dev/null; then
  echo -e "${RED}✗ Vercel CLI not found.${RESET}"
  echo "  Install it with:  npm i -g vercel"
  exit 1
fi
echo -e "${GREEN}✓${RESET} Vercel CLI found: $(vercel --version 2>/dev/null || echo 'unknown')"

if [ ! -f .env ]; then
  echo -e "${RED}✗ .env file not found.${RESET}"
  echo "  Run 'bash scripts/setup-supabase.sh' first to create it."
  exit 1
fi
echo -e "${GREEN}✓${RESET} .env file found"

# ── Link to Vercel project (idempotent) ──────────────────────────────
echo ""
echo -e "${BOLD}━━━ Linking to Vercel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if [ ! -f .vercel/project.json ]; then
  echo "  No existing Vercel link found. Running 'vercel link'..."
  echo ""
  if ! vercel link --yes 2>&1; then
    echo -e "${RED}✗ Failed to link project. Make sure you're logged in ('vercel login').${RESET}"
    exit 1
  fi
  echo ""
fi
PROJECT_DIR=$(cat .vercel/project.json 2>/dev/null | grep -o '"orgId":"[^"]*"' | head -1 || true)
echo -e "  ${GREEN}✓${RESET} Linked to Vercel project ${DIM}${PROJECT_DIR:-}${RESET}"

# ── Helper: read a value from .env ───────────────────────────────────
get_env() {
  local key="$1"
  local val
  val=$(grep -E "^${key}=" .env 2>/dev/null | head -1 | sed "s/^${key}=//" | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")
  echo "$val"
}

# ── Helper: set a Vercel env var ─────────────────────────────────────
set_vercel_env() {
  local key="$1"
  local value="$2"
  local label="$3"
  local is_secret="${4:-no}"

  if [ -z "$value" ]; then
    echo -e "  ${AMBER}⚠${RESET} ${key} is empty — skipping"
    return 1
  fi

  echo -n "  Setting ${key}"
  if [ "$is_secret" = "yes" ]; then
    echo -n " (secret)"
  fi
  echo -n " → ${ENVS[*]} ... "

  local env_flags=()
  for env in "${ENVS[@]}"; do
    env_flags+=("-e" "$env")
  done

  if printf '%s' "$value" | vercel env add "$key" "${env_flags[@]}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${RESET}"
    return 0
  else
    echo -e "${RED}✗${RESET}"
    return 1
  fi
}

# ── Read values from .env ────────────────────────────────────────────
DATABASE_URL=$(get_env "DATABASE_URL")
JWT_SECRET=$(get_env "JWT_SECRET")

# ── Validate values ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Validating .env values ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
ERRORS=0

if echo "$DATABASE_URL" | grep -qE '^postgresql://|^postgres://'; then
  echo -e "  ${GREEN}✓${RESET} DATABASE_URL  (PostgreSQL with PgBouncer)"
else
  echo -e "  ${RED}✗${RESET} DATABASE_URL  missing or invalid"
  ERRORS=$((ERRORS + 1))
fi

if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -ge 32 ]; then
  echo -e "  ${GREEN}✓${RESET} JWT_SECRET   (${#JWT_SECRET} chars)"
else
  echo -e "  ${RED}✗${RESET} JWT_SECRET   missing or too short (need 32+ chars)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}✗ $ERRORS required value(s) missing or invalid.${RESET}"
  echo "  Fix your .env file, then re-run this script."
  exit 1
fi

# ── Push env vars to Vercel ──────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Pushing environment variables to Vercel ━━━━━━━━━━━━━━━${RESET}"
echo ""

SET_OK=0
SET_FAIL=0

if set_vercel_env "DATABASE_URL" "$DATABASE_URL" "PostgreSQL (PgBouncer)" "yes"; then
  SET_OK=$((SET_OK + 1))
else
  SET_FAIL=$((SET_FAIL + 1))
fi

if set_vercel_env "JWT_SECRET" "$JWT_SECRET" "JWT signing secret" "yes"; then
  SET_OK=$((SET_OK + 1))
else
  SET_FAIL=$((SET_FAIL + 1))
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Set:   ${GREEN}${SET_OK}${RESET} variables"
if [ "$SET_FAIL" -gt 0 ]; then
  echo -e "  Failed: ${RED}${SET_FAIL}${RESET} variables"
fi
echo ""
echo -e "  View env vars:  ${DIM}vercel env ls${RESET}"
echo -e "  Pull env vars:  ${DIM}vercel env pull .env.local${RESET}"
echo ""

if [ "$SET_FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${GREEN}${BOLD}║   ✓ Vercel environment configured! (JWT auth)              ║${RESET}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo "  Push a commit or redeploy to pick up the new variables."
  echo "  Login: admin@meridian.com / Admin@123"
  echo ""
else
  echo -e "${AMBER}⚠  Some variables failed to set. Check the errors above.${RESET}"
  echo "  You can also set them manually in the Vercel dashboard."
  echo ""
  exit 1
fi
