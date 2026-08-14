-- Migration: Sync Prisma schema columns that were added after initial schema
-- Date: 2025-08-04
--
-- These columns exist in prisma/schema.prisma but were missing from the
-- initial Supabase migration (20260729000000_init_schema.sql).
-- prisma db push should handle this, but we add explicit ALTER TABLE
-- statements as a reliable fallback for all deployment platforms.

-- ─── 1. NightAudit: add snapshot columns ───
ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "totalRooms" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "occupiedRooms" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "arrivals" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NightAudit" ADD COLUMN IF NOT EXISTS "departures" INTEGER NOT NULL DEFAULT 0;

-- ─── 2. NightAudit: add composite index (used by KPI queries) ───
CREATE INDEX IF NOT EXISTS "NightAudit_status_businessDate_idx" ON "NightAudit"("status", "businessDate");

-- ─── 3. RoomType: add metric area (sq meters) ───
ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "areaSqM" DOUBLE PRECISION;

-- ─── 4. JournalEntry: add audit trail columns ───
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "sourceModule" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "postedBy" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP(3);

-- ─── 5. LedgerAccount: add department / cost center ───
ALTER TABLE "LedgerAccount" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- ─── 6. RefreshToken: add token family tracking columns ───
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenFamilyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "replacedBy" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenFamilyId_idx" ON "RefreshToken"("tokenFamilyId");
