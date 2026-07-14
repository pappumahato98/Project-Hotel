#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  setup.sh — One-command Turso + Vercel deployment setup
#
#  Usage:
#    chmod +x scripts/setup.sh
#    ./scripts/setup.sh
#
#  What it does:
#    1. Installs Turso CLI (if missing)
#    2. Creates a Turso database in Singapore (closest to Nepal)
#    3. Pushes your Prisma schema
#    4. Seeds initial data (hotel, rooms, users)
#    5. Installs Vercel CLI (if missing)
#    6. Links to your Vercel project
#    7. Sets DATABASE_URL env var on Vercel
#    8. Triggers the first deployment
#
#  Prerequisites:
#    - A Turso account (free): https://turso.tech/app/signup
#    - A Vercel account (free): https://vercel.com/signup
#    - Node.js 18+ and npm/bun installed
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
step()  { echo -e "\n${BOLD}━━━ $1 ━━━${NC}"; }

DB_NAME="meridian-hotel"
DB_REGION="ap-southeast-1"   # Singapore — lowest latency for Nepal

# ─── 1. TURSO CLI ──────────────────────────────────────
step "Installing / checking Turso CLI"

if command -v turso &>/dev/null; then
  info "Turso CLI already installed: $(turso --version 2>/dev/null | head -1)"
else
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
  if command -v turso &>/dev/null; then
    info "Turso CLI installed"
  else
    err "Failed to install Turso CLI. Install manually: https://docs.turso.tech/tutorials/cli"
  fi
fi

# ─── 2. AUTHENTICATE TURSO ─────────────────────────────
step "Authenticating Turso"

if turso auth whoami &>/dev/null; then
  info "Already logged into Turso"
else
  echo ""
  echo "  Please log in to your Turso account."
  echo "  If you don't have one, create one free at: https://turso.tech/app/signup"
  echo ""
  turso auth login
  if ! turso auth whoami &>/dev/null; then
    err "Turso authentication failed"
  fi
  info "Logged into Turso"
fi

# ─── 3. CREATE TURSO DATABASE ──────────────────────────
step "Creating Turso database"

if turso db show "$DB_NAME" &>/dev/null; then
  warn "Database '$DB_NAME' already exists, skipping creation"
else
  turso db create "$DB_NAME" --region "$DB_REGION"
  info "Database '$DB_NAME' created in $DB_REGION"
fi

# Get the connection URL
TURSO_URL=$(turso db show "$DB_NAME" --url)
echo "  Database URL: $TURSO_URL"

# ─── 4. PUSH PRISMA SCHEMA ─────────────────────────────
step "Pushing Prisma schema to Turso"

# Use the Turso URL temporarily for schema push
export DATABASE_URL="$TURSO_URL"
npx prisma db push --accept-data-loss 2>&1
info "Schema pushed to Turso"

# ─── 5. SEED THE DATABASE ──────────────────────────────
step "Seeding database with initial data"

npx tsx scripts/vercel-seed.ts 2>&1
info "Database seeded"

# ─── 6. GET AUTH TOKEN FOR CONNECTION ──────────────────
step "Generating database auth token"

TURSO_TOKEN=$(turso db tokens create "$DB_NAME")
TURSO_URL_WITH_AUTH="${TURSO_URL}?authToken=${TURSO_TOKEN}"

echo ""
echo -e "${BOLD}Your DATABASE_URL (save this):${NC}"
echo -e "${GREEN}${TURSO_URL_WITH_AUTH}${NC}"
echo ""

# ─── 7. VERCEL CLI ─────────────────────────────────────
step "Installing / checking Vercel CLI"

if command -v vercel &>/dev/null; then
  info "Vercel CLI already installed"
else
  npm i -g vercel 2>&1
  if command -v vercel &>/dev/null; then
    info "Vercel CLI installed"
  else
    err "Failed to install Vercel CLI"
  fi
fi

# ─── 8. LINK TO VERCEL PROJECT ─────────────────────────
step "Linking to Vercel"

if [ -f ".vercel/project.json" ]; then
  info "Already linked to Vercel project: $(cat .vercel/project.json | grep -o '"name":"[^"]*"' | head -1)"
else
  echo ""
  echo "  Linking to your Vercel account..."
  echo "  Use default answers (press Enter) for most prompts."
  echo "  Set up name: meridian-hotel (or your preferred name)"
  echo ""
  vercel link --yes 2>&1
  info "Linked to Vercel"
fi

# ─── 9. SET ENVIRONMENT VARIABLES ON VERCEL ────────────
step "Setting DATABASE_URL on Vercel"

echo "$TURSO_URL_WITH_AUTH" | vercel env add DATABASE_URL production 2>&1
echo "$TURSO_URL_WITH_AUTH" | vercel env add DATABASE_URL preview 2>&1
echo "$TURSO_URL_WITH_AUTH" | vercel env add DATABASE_URL development 2>&1
info "DATABASE_URL set for all environments"

# ─── 10. DEPLOY ────────────────────────────────────────
step "Triggering first deployment"

vercel --prod 2>&1
info "Deployment triggered!"

# ─── DONE ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  🎉 SETUP COMPLETE!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  📦 Turso DB:    $TURSO_URL"
echo "  🌐 Vercel:      Check the deploy URL above"
echo "  🔑 Login:       admin@meridian.com / password123"
echo ""
echo "  From now on, every push to GitHub triggers an"
echo "  automatic deploy with schema sync + auto-seed."
echo ""
echo -e "${YELLOW}  ⚠️  Important: Save your DATABASE_URL somewhere safe!${NC}"
echo -e "${YELLOW}  If you lose it, regenerate with: turso db tokens create $DB_NAME${NC}"
echo ""