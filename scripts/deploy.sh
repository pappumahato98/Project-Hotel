#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# deploy.sh — One-command deploy to Vercel AND Render
#
# Usage:
#   VERCEL_TOKEN=xxx RENDER_API_KEY=xxx bash scripts/deploy.sh         # deploy both
#   VERCEL_TOKEN=xxx bash scripts/deploy.sh vercel                      # Vercel only
#   RENDER_API_KEY=xxx bash scripts/deploy.sh render                    # Render only
#   bash scripts/deploy.sh                                               # interactive (prompts for tokens)
#
# Token sources:
#   Vercel:  https://vercel.com/account/tokens  → Create Token
#   Render:  https://dashboard.render.com/account/api-keys → Create API Key
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

BOLD='\033[1m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

REPO_URL="https://github.com/pappumahato98/Project-Neo"
SERVICE_NAME="meridian-pms"
BUILD_CMD="npx prisma db push --accept-data-loss 2>&1 && npx prisma generate && npx next build"
START_CMD="npx next start -H 0.0.0.0 -p \$PORT"
BRANCH="main"
REGION="singapore"
PLAN="starter"

# ── Read secrets from .env ───────────────────────────────────────────
DATABASE_URL=$(grep '^DATABASE_URL=' .env 2>/dev/null | sed 's/^DATABASE_URL=//' | sed 's/^"//;s/"$//' || true)
JWT_SECRET=$(grep '^JWT_SECRET=' .env 2>/dev/null | sed 's/^JWT_SECRET=//' | sed 's/^"//;s/"$//' || true)

# ── Banner ───────────────────────────────────────────────────────────
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Meridian PMS — Deploy to Vercel + Render                 ║${RESET}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Validate .env ────────────────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}✗ DATABASE_URL not found in .env${RESET}"
  echo "  Run: bash scripts/setup-supabase.sh"
  exit 1
fi
if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
  echo -e "${RED}✗ JWT_SECRET not found or too short in .env${RESET}"
  exit 1
fi
echo -e "  ${GREEN}✓${RESET} DATABASE_URL  (${DATABASE_URL:0:40}...)"
echo -e "  ${GREEN}✓${RESET} JWT_SECRET   (${#JWT_SECRET} chars)"
echo ""

# ── Determine which platforms to deploy ─────────────────────────────
TARGETS=("${@:-vercel render}")
DO_VERCEL=false
DO_RENDER=false
for t in "${TARGETS[@]}"; do
  case "$t" in
    vercel) DO_VERCEL=true ;;
    render) DO_RENDER=true ;;
  esac
done

# ═══════════════════════════════════════════════════════════════════════
# VERCEL DEPLOY
# ═══════════════════════════════════════════════════════════════════════
deploy_vercel() {
  echo -e "${BOLD}━━━ Deploying to Vercel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""

  # ── Get token ─────────────────────────────────────────────────────
  local TOKEN="${VERCEL_TOKEN:-}"
  if [ -z "$TOKEN" ]; then
    echo -n "  Paste your Vercel token (${DIM}https://vercel.com/account/tokens${RESET}): "
    read -r -s TOKEN
    echo ""
  fi
  if [ -z "$TOKEN" ]; then
    echo -e "  ${RED}✗ No Vercel token provided. Skipping.${RESET}"
    return 1
  fi

  # ── Install CLI if needed ──────────────────────────────────────────
  if ! command -v vercel &>/dev/null; then
    echo "  Installing Vercel CLI..."
    npm i -g vercel 2>/dev/null | tail -1
  fi

  # ── Set env vars ──────────────────────────────────────────────────
  echo "  Setting environment variables..."
  echo "$DATABASE_URL" | vercel env add DATABASE_URL production preview development --token="$TOKEN" 2>/dev/null
  echo "$JWT_SECRET"   | vercel env add JWT_SECRET   production preview development --token="$TOKEN" 2>/dev/null

  # ── Link project (idempotent) ──────────────────────────────────────
  if [ ! -f .vercel/project.json ]; then
    echo "  Linking to Vercel..."
    echo "$REPO_URL" | vercel link --yes --token="$TOKEN" 2>&1 | tail -3
  fi

  # ── Deploy ─────────────────────────────────────────────────────────
  echo "  Deploying to Vercel..."
  local DEPLOY_OUTPUT
   DEPLOY_OUTPUT=$(vercel deploy --prod --yes --token="$TOKEN" 2>&1)
  echo "$DEPLOY_OUTPUT"

  # ── Extract URL ────────────────────────────────────────────────────
  local URL
  URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1)
  if [ -n "$URL" ]; then
    echo ""
    echo -e "  ${GREEN}${BOLD}✓ Deployed:${RESET} ${CYAN}${URL}${RESET}"
  else
    echo ""
    echo -e "  ${AMBER}⚠ Deploy initiated. Check Vercel dashboard for URL.${RESET}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════
# RENDER DEPLOY
# ═══════════════════════════════════════════════════════════════════════
deploy_render() {
  echo -e "${BOLD}━━━ Deploying to Render ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""

  # ── Get API key ───────────────────────────────────────────────────
  local KEY="${RENDER_API_KEY:-}"
  if [ -z "$KEY" ]; then
    echo -n "  Paste your Render API key (${DIM}https://dashboard.render.com/account/api-keys${RESET}): "
    read -r -s KEY
    echo ""
  fi
  if [ -z "$KEY" ]; then
    echo -e "  ${RED}✗ No Render API key provided. Skipping.${RESET}"
    return 1
  fi

  # ── Check if service already exists ────────────────────────────────
  echo "  Checking for existing service..."
  local EXISTING
  EXISTING=$(curl -s "https://api.render.com/v1/services" \
    -H "Authorization: Bearer $KEY" \
    -H "Accept: application/json" 2>/dev/null | \
    python3 -c "
import sys, json
services = json.load(sys.stdin)
for s in services:
    if s.get('serviceDetails', {}).get('rootDir', '') == '' and s.get('serviceDetails', {}).get('buildCommand', '') == '$BUILD_CMD':
        print(s['id'])
        break
" 2>/dev/null || true)

  if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ] && [ "$EXISTING" != "null" ]; then
    echo -e "  ${AMBER}⚠${RESET} Service already exists (ID: ${DIM}${EXISTING}${RESET})"
    echo "  Triggering redeploy..."
    DEPLOY_RESP=$(curl -s -X POST "https://api.render.com/v1/services/${EXISTING}/deploys" \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      -d '{"clearCache":false}' 2>/dev/null)
    echo "  Deploy triggered."
  else
    # ── Create new service ────────────────────────────────────────────
    echo "  Creating new web service..."
    CREATE_RESP=$(curl -s -X POST "https://api.render.com/v1/services" \
      -H "Authorization: Bearer $KEY" \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      -d "{\n      \"type\": \"web_service\",\n      \"name\": \"${SERVICE_NAME}\",\n      \"repoUrl\": \"${REPO_URL}\",\n      \"branch\": \"${BRANCH}\",\n      \"buildCommand\": \"${BUILD_CMD}\",\n      \"startCommand\": \"${START_CMD}\",\n      \"plan\": \"${PLAN}\",\n      \"region\": \"${REGION}\",\n      \"envVars\": [\n        {\"key\": \"DATABASE_URL\", \"value\": \"${DATABASE_URL}\"},\n        {\"key\": \"JWT_SECRET\", \"value\": \"${JWT_SECRET}\"}\n      ]\n    }" 2>/dev/null)

    SERVICE_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
    SERVICE_URL=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('serviceDetails',{}).get('url',''))" 2>/dev/null || true)

    if [ -n "$SERVICE_ID" ]; then
      echo -e "  ${GREEN}✓${RESET} Service created: ${DIM}${SERVICE_ID}${RESET}"
    else
      echo -e "  ${RED}✗${RESET} Failed to create service:"
      echo "$CREATE_RESP" | head -10
      return 1
    fi
  fi

  echo ""
  echo -e "  ${GREEN}${BOLD}✓ Render deployment initiated${RESET}"
  echo -e "  Dashboard: ${CYAN}https://dashboard.render.com/web/${SERVICE_ID:-services}${RESET}"
  if [ -n "${SERVICE_URL:-}" ]; then
    echo -e "  URL:      ${CYAN}https://${SERVICE_URL}${RESET}"
  fi
  echo -e "  ${DIM}First build takes ~3-5 minutes. Monitor in the dashboard.${RESET}"
}

# ── Run deployments ──────────────────────────────────────────────────
ERRORS=0

if [ "$DO_VERCEL" = true ]; then
  echo ""
  deploy_vercel || ERRORS=$((ERRORS + 1))
  echo ""
fi

if [ "$DO_RENDER" = true ]; then
  echo ""
  deploy_render || ERRORS=$((ERRORS + 1))
  echo ""
fi

# ── Final summary ────────────────────────────────────────────────────
echo -e "${BOLD}════════════════════════════════════════════════════════════${RESET}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✓ All deployments successful!${RESET}"
else
  echo -e "${AMBER}  ⚠ $ERRORS deployment(s) had issues. Check above.${RESET}"
fi
echo -e "${BOLD}════════════════════════════════════════════════════════════${RESET}"
