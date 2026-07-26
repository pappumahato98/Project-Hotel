#!/usr/bin/env bash
#
# setup-turso.sh — Create a Turso DB for Meridian PMS and print the DATABASE_URL
#
# Run this in your own terminal (where you have a browser).
# It will:
#   1. Install Turso CLI if missing
#   2. Log you into Turso (opens browser)
#   3. Create a database called `meridian-pms`
#   4. Print the DATABASE_URL you need to paste into Vercel
#
set -euo pipefail

DB_NAME="meridian-pms"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Meridian PMS — Turso Database Setup                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Ensure Turso CLI is installed ─────────────────────
if ! command -v turso &>/dev/null; then
  echo "▶ Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
  echo "✓ Turso CLI installed"
  echo ""
else
  echo "✓ Turso CLI already installed: $(turso --version)"
fi

# ── Step 2: Authenticate ──────────────────────────────────────
if ! turso auth whoami &>/dev/null; then
  echo "▶ Logging into Turso (a browser window will open)..."
  turso auth login
  echo "✓ Logged in as: $(turso auth whoami)"
  echo ""
else
  echo "✓ Already logged in as: $(turso auth whoami)"
fi

# ── Step 3: Create the database ───────────────────────────────
if turso db list 2>/dev/null | grep -q "^$DB_NAME\b"; then
  echo "✓ Database '$DB_NAME' already exists — reusing it."
else
  echo "▶ Creating database '$DB_NAME' (this takes ~30s)..."
  turso db create "$DB_NAME" --location sin1
  echo "✓ Database created"
fi
echo ""

# ── Step 4: Get the connection URL and auth token ─────────────
DB_URL=$(turso db show "$DB_NAME" --url)
DB_TOKEN=$(turso db tokens create "$DB_NAME")

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Turso database ready!                               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "────────────────────────────────────────────────────────────"
echo "  YOUR DATABASE_URL (copy this entire line):"
echo "────────────────────────────────────────────────────────────"
echo ""
echo "${DB_URL}?authToken=${DB_TOKEN}"
echo ""
echo "────────────────────────────────────────────────────────────"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Go to: https://vercel.com/pappumahato98-7206s-projects/project-neo/settings/environment-variables"
echo ""
echo "2. Click \"Add New\" and create a new environment variable:"
echo "   Key:   DATABASE_URL"
echo "   Value: (paste the URL above)"
echo "   Environments: ✅ Production  ✅ Preview  ✅ Development"
echo ""
echo "3. Click Save."
echo ""
echo "4. Go to: https://vercel.com/pappumahato98-7206s-projects/project-neo"
echo "   Click the menu (⋮) on the latest deployment → \"Redeploy\" → \"Redeploy\""
echo "   (Or push any new commit to main to trigger a fresh build)"
echo ""
echo "5. On the next build, Vercel will:"
echo "   • Connect to your Turso DB"
echo "   • Push the Prisma schema (create tables)"
echo "   • Seed demo data (hotel, rooms, users)"
echo "   • Build the Next.js app"
echo ""
echo "6. Once deployment is green, visit your production URL and"
echo "   log in with: admin@meridian.com  /  password123"
echo ""
