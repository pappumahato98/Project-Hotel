#!/usr/bin/env bash
#
# vercel-build.sh — Vercel build pipeline for Meridian PMS
#
# Steps:
#   1. Validate DATABASE_URL (must be a Turso libsql:// URL)
#   2. Generate Prisma client
#   3. Push Prisma schema to the database (create tables)
#   4. Seed demo data (hotel, rooms, users) — only if DB is empty
#   5. Build the Next.js app
#
set -euo pipefail

echo "▶ Meridian PMS — Vercel build pipeline"
echo ""

# ── Step 1: Validate DATABASE_URL ─────────────────────────────
node -e '
  const u = process.env.DATABASE_URL || "";
  if (!u) {
    console.error("");
    console.error("❌ FATAL: DATABASE_URL is not set.");
    console.error("   On Vercel, set DATABASE_URL to a Turso libsql:// URL.");
    console.error("   Steps:");
    console.error("     1. Create a free Turso DB at https://turso.tech/app/signup");
    console.error("     2. Add DATABASE_URL env var in Vercel project settings:");
    console.error("        https://vercel.com/pappumahato98-7206s-projects/project-neo/settings/environment-variables");
    console.error("     3. Redeploy.");
    console.error("");
    process.exit(1);
  }
  if (u.startsWith("file:")) {
    console.error("");
    console.error("❌ FATAL: DATABASE_URL is a local file: path.");
    console.error("   This does not work on Vercel — serverless functions have a read-only filesystem.");
    console.error("   Set DATABASE_URL to a Turso libsql:// URL in your Vercel project settings.");
    console.error("");
    process.exit(1);
  }
  if (!u.startsWith("libsql://") && !u.startsWith("https://")) {
    console.error("");
    console.error("❌ FATAL: DATABASE_URL has unsupported scheme: " + u.split(":")[0]);
    console.error("   Expected a Turso libsql:// URL.");
    console.error("");
    process.exit(1);
  }
  console.log("✓ DATABASE_URL is set (" + u.split(":")[0] + " scheme)");
'
echo ""

# ── Step 2: Generate Prisma client ────────────────────────────
echo "▶ Generating Prisma client..."
bunx prisma generate
echo "✓ Prisma client generated"
echo ""

# ── Step 3: Push schema to database ───────────────────────────
echo "▶ Pushing Prisma schema to database (creating tables)..."
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
