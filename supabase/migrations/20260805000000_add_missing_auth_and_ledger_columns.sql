-- Migration: Add missing AuthUser.passwordHash and LedgerAccount.subtype columns
-- Date: 2025-08-05
--
-- These columns exist in prisma/schema.prisma but were missed in the
-- initial Supabase migration and the previous sync migration.

-- ─── 1. AuthUser: add password hash (critical for authentication) ───
ALTER TABLE "AuthUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT '';

-- ─── 2. LedgerAccount: add subtype (cash, bank, receivable, etc.) ───
ALTER TABLE "LedgerAccount" ADD COLUMN IF NOT EXISTS "subtype" TEXT;
