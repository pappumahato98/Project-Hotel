-- Migration: Refresh Token Family — replay attack detection
-- Date: 2025-08-01

ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenFamilyId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "replacedBy" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenFamilyId_idx" ON "RefreshToken"("tokenFamilyId");
