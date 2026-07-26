#!/usr/bin/env bash
#
# vercel-build.sh — Vercel build pipeline for Meridian PMS (Supabase + Postgres)
#
# Steps:
#   1. Validate required env vars (DATABASE_URL + Supabase keys)
#   2. Generate Prisma client
#   3. Push Prisma schema to Postgres (create tables)
#   4. Seed demo data (Supabase auth users + hotel data) — only if DB is empty
#   5. Build the Next.js app
#
set -euo pipefail

echo "▶ Meridian PMS — Vercel build pipeline (Supabase)"
echo ""

# ── Step 1: Validate env vars ─────────────────────────────────
node -e '
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
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
    console.error("   Values come from your Supabase project:");
    console.error("   https://supabase.com/dashboard → Your Project → Settings → API");
    console.error("");
    process.exit(1);
  }
  console.log("✓ All required env vars are set");
  console.log("  DATABASE_URL: " + (process.env.DATABASE_URL.startsWith("postgresql://") ? "postgresql:// ✓" : "⚠️  not postgresql://"));
  console.log("  NEXT_PUBLIC_SUPABASE_URL: " + process.env.NEXT_PUBLIC_SUPABASE_URL.split("://")[0] + ":// ✓");
'
echo ""

# ── Step 2: Generate Prisma client ────────────────────────────
echo "▶ Generating Prisma client..."
bunx prisma generate
echo "✓ Prisma client generated"
echo ""

# ── Step 3: Push schema to database ───────────────────────────
echo "▶ Pushing Prisma schema to Postgres (creating tables)..."
bunx prisma db push --accept-data-loss
echo "✓ Schema pushed"
echo ""

# ── Step 4: Seed demo data ────────────────────────────────────
echo "▶ Seeding demo data (skipped if DB already has data)..."
bunx tsx scripts/vercel-seed.ts
echo ""

# ── Step 5: Build Next.js app ─────────────────────────────────
echo "▶ Building Next.js app..."
next build
echo ""
echo "🎉 Vercel build pipeline complete."
