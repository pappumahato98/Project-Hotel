#!/bin/bash
# Vercel + Supabase Environment Setup for Meridian PMS
#
# This script helps you configure environment variables on Vercel.
# Run this AFTER connecting your repo to Vercel.
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel
#   - Supabase project with tables already pushed (prisma db push)
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
# Defaults to all three if none specified
ENVS=("${@:-production preview development}")

# ── Banner ───────────────────────────────────────────────────────────
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Meridian PMS — Vercel Environment Setup                ║${RESET}"
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
echo -e "${BOLD}━━━ Linking to Vercel ━━━━━━━━━━━━━══━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

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
  # Handle both quoted and unquoted values; strip surrounding quotes
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

  # Build env flag list
  local env_flags=()
  for env in "${ENVS[@]}"; do
    env_flags+=("-e" "$env")
  done

  # Pipe value into vercel env add
  # Using printf to avoid trailing newline issues
  if printf '%s' "$value" | vercel env add "$key" "${env_flags[@]}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${RESET}"
    return 0
  else
    echo -e "${RED}✗${RESET}"
    return 1
  fi
}

# ── Helper: validate a URL ───────────────────────────────────────────
check_url() {
  echo "$1" | grep -qE '^https?://'
}

# ── Helper: validate a JWT ───────────────────────────────────────────
check_jwt() {
  echo "$1" | grep -qE '^eyJ'
}

# ── Helper: validate a postgres URL ──────────────────────────────────
check_pg() {
  echo "$1" | grep -qE '^postgresql://|^postgres://'
}

# ── Read values from .env ────────────────────────────────────────────
DATABASE_URL=$(get_env "DATABASE_URL")
DIRECT_URL=$(get_env "DIRECT_URL")
SUPABASE_URL=$(get_env "NEXT_PUBLIC_SUPABASE_URL")
ANON_KEY=$(get_env "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SERVICE_KEY=$(get_env "SUPABASE_SERVICE_ROLE_KEY")

# ── Validate values ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Validating .env values ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
ERRORS=0

if check_pg "$DATABASE_URL"; then
  echo -e "  ${GREEN}✓${RESET} DATABASE_URL           (PostgreSQL connection)"
else
  echo -e "  ${RED}✗${RESET} DATABASE_URL           missing or invalid"
  ERRORS=$((ERRORS + 1))
fi

if check_pg "$DIRECT_URL"; then
  echo -e "  ${GREEN}✓${RESET} DIRECT_URL             (Direct connection for migrations)"
else
  echo -e "  ${AMBER}⚠${RESET} DIRECT_URL             ${DIM}not set — migrations will fall back to DATABASE_URL${RESET}"
fi

if check_url "$SUPABASE_URL"; then
  echo -e "  ${GREEN}✓${RESET} NEXT_PUBLIC_SUPABASE_URL"
else
  echo -e "  ${RED}✗${RESET} NEXT_PUBLIC_SUPABASE_URL missing or invalid"
  ERRORS=$((ERRORS + 1))
fi

if check_jwt "$ANON_KEY"; then
  echo -e "  ${GREEN}✓${RESET} NEXT_PUBLIC_SUPABASE_ANON_KEY"
else
  echo -e "  ${RED}✗${RESET} NEXT_PUBLIC_SUPABASE_ANON_KEY missing or invalid"
  ERRORS=$((ERRORS + 1))
fi

if check_jwt "$SERVICE_KEY"; then
  echo -e "  ${GREEN}✓${RESET} SUPABASE_SERVICE_ROLE_KEY"
else
  echo -e "  ${RED}✗${RESET} SUPABASE_SERVICE_ROLE_KEY missing or invalid"
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

if [ -n "$DIRECT_URL" ]; then
  if set_vercel_env "DIRECT_URL" "$DIRECT_URL" "PostgreSQL (direct)" "yes"; then
    SET_OK=$((SET_OK + 1))
  else
    SET_FAIL=$((SET_FAIL + 1))
  fi
fi

if set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL" "Supabase Project URL" "no"; then
  SET_OK=$((SET_OK + 1))
else
  SET_FAIL=$((SET_FAIL + 1))
fi

if set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY" "Supabase Anon Key" "no"; then
  SET_OK=$((SET_OK + 1))
else
  SET_FAIL=$((SET_FAIL + 1))
fi

if set_vercel_env "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_KEY" "Supabase Service Role Key" "yes"; then
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
  echo -e "${GREEN}${BOLD}║   ✓ Vercel environment variables configured!             ║${RESET}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo "  Your Vercel deployments will now connect to Supabase."
  echo "  Push a commit or redeploy to pick up the new variables."
  echo ""
else
  echo -e "${AMBER}⚠  Some variables failed to set. Check the errors above.${RESET}"
  echo "  You can also set them manually in the Vercel dashboard:"
  echo "  ${DIM}https://vercel.com/your-team/your-project/settings/environment-variables${RESET}"
  echo ""
  exit 1
fi