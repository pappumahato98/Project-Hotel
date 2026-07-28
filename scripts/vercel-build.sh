#!/usr/bin/env bash
#
# vercel-build.sh — Vercel build pipeline for Meridian PMS (Supabase + Postgres)
#
# Steps:
#   1. Validate required env vars (DATABASE_URL + Supabase keys)
#   2. Generate Prisma client
#   3. Push Prisma schema to Postgres (only if tables don't exist — skips on subsequent builds)
#   4. Seed demo data (only if DB is empty — skips on subsequent builds)
#   5. Build the Next.js app
#
set -eo pipefail

echo "▶ Meridian PMS — Vercel build pipeline (Supabase)"
echo ""

# ── Step 0: Detect available package runner ──────────────────────
# Vercel may have bun or npm+npx available — use whatever works.
if command -v bunx &>/dev/null; then
  RUNNER="bunx"
  echo "✓ Using bunx"
elif command -v npx &>/dev/null; then
  RUNNER="npx"
  echo "✓ Using npx"
else
  echo "❌ FATAL: Neither bunx nor npx found in PATH"
  echo "   PATH=$PATH"
  exit 1
fi
echo ""

# ── Step 1: Validate env vars ─────────────────────────────────
echo "▶ Checking environment variables..."
node -e '
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const missing = Object.entries(required).filter(([, v]) => !v);
  if (missing.length) {
    console.error("");
    console.error("❌ FATAL: Missing required environment variables:");
    missing.forEach(([k]) => console.error("   - " + k));
    console.error("");
    console.error("   Set these in your Vercel project settings:");
    console.error("   https://vercel.com/pappumahato98-7206s-projects/project-neo/settings/environment-variables");
    console.error("");
    console.error("   Make sure to set them for ALL environments (Production, Preview, Development)");
    console.error("");
    process.exit(1);
  }
  console.log("✓ All 5 required env vars are present");
  console.log("  DATABASE_URL: " + (process.env.DATABASE_URL.startsWith("postgresql://") ? "postgresql:// ✓" : "⚠️  not postgresql://"));
  console.log("  DIRECT_URL: " + (process.env.DIRECT_URL.startsWith("postgresql://") ? "postgresql:// ✓" : "⚠️  not postgresql://"));
  console.log("  NEXT_PUBLIC_SUPABASE_URL: " + process.env.NEXT_PUBLIC_SUPABASE_URL.split("://")[0] + ":// ✓");
'
echo ""

# ── Step 2: Generate Prisma client ────────────────────────────
echo "▶ Generating Prisma client..."
$RUNNER prisma generate
echo "✓ Prisma client generated"
echo ""

# ── Step 3: Push schema to database (skip if tables exist) ────
echo "▶ Checking if database tables exist..."
# Try a simple query — if it works, tables already exist
if node -e "
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  db.property.count().then(c => {
    if (c > 0) { process.exit(0); } // tables exist
    else { process.exit(1); } // tables missing
  }).catch(() => process.exit(1));
" 2>/dev/null; then
  echo "✓ Database tables already exist, skipping schema push"
else
  echo "  No tables found — pushing Prisma schema to Postgres..."
  $RUNNER prisma db push --accept-data-loss
  echo "✓ Schema pushed"
fi
echo ""

# ── Step 4: Seed demo data (skip if data exists) ──────────────
echo "▶ Checking if seed data exists..."
if node -e "
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  db.property.count().then(c => {
    if (c > 0) { process.exit(0); } // data exists
    else { process.exit(1); } // no data
  }).catch(() => process.exit(1));
" 2>/dev/null; then
  echo "✓ Seed data already exists, skipping seed"
else
  echo "  No data found — running seed..."
  $RUNNER tsx scripts/vercel-seed.ts
  echo "✓ Seed complete"
fi
echo ""

# ── Step 5: Build Next.js app ─────────────────────────────────
echo "▶ Building Next.js app..."
npx next build
echo ""
echo "🎉 Vercel build pipeline complete."
