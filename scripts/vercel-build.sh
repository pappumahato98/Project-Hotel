#!/usr/bin/env bash
#
# vercel-build.sh — Vercel build pipeline for Meridian PMS (Supabase + Postgres)
#
# Steps:
#   1. Validate required env vars
#   2. Generate Prisma client
#   3. Push schema (idempotent — no-op if tables already match)
#   4. Build the Next.js app
#
set -eo pipefail

echo "▶ Meridian PMS — Vercel build pipeline (Supabase)"
echo ""

# ── Step 1: Validate env vars ─────────────────────────────────
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
    console.error("   Set them here: https://vercel.com/pappumahato98-7206s-projects/project-neo/settings/environment-variables");
    console.error("   Make sure to set for ALL environments: Production, Preview, Development");
    console.error("");
    process.exit(1);
  }
  console.log("✓ All 5 env vars present");
  console.log("  DATABASE_URL: " + (process.env.DATABASE_URL.startsWith("postgresql://") ? "postgresql:// ✓" : "⚠️ unexpected"));
  console.log("  NEXT_PUBLIC_SUPABASE_URL: " + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 40) + "...");
'
echo ""

# ── Step 2: Generate Prisma client ────────────────────────────
echo "▶ Generating Prisma client..."
npx prisma generate
echo "✓ Prisma client generated"
echo ""

# ── Step 3: Push schema to Postgres (idempotent) ──────────────
echo "▶ Pushing Prisma schema to Postgres (idempotent)..."
npx prisma db push --accept-data-loss 2>&1
echo "✓ Schema pushed / verified"
echo ""

# ── Step 4: Build Next.js app ────────────────────────────────
echo "▶ Building Next.js app..."
npx next build
echo ""
echo "🎉 Build complete."
