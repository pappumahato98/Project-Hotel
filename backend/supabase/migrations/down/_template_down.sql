-- ============================================================
-- Migration: <ONE_LINE_DESCRIPTION>
-- Date:       YYYY-MM-DD
-- Author:     <you>
-- Reverses:   <migration_filename_or_NONE_if_new>
-- ============================================================
--
-- USAGE:
--   This is a *down* migration. Run it ONLY after the corresponding
--   up-migration has been applied, and ONLY in environments where
--   rollback is safe (typically dev/staging, never production without
--   a backup).
--
--   supabase migration up    # applies new migrations
--   supabase migration down  # rolls back the most recent (NOT supported by Supabase CLI by default)
--
--   To run a specific down-migration manually:
--     psql "$DATABASE_URL" -f supabase/migrations/down/<this_file>.sql
--
--   The included `repair-migrations.js` script lists pending and
--   applied migrations, can mark a migration as repaired in
--   supabase_migrations.schema_migrations, and can run down-migrations
--   from supabase/migrations/down/.
--
-- SAFETY CHECKS:
--   1. Always backup before running: pg_dump > backup_$(date +%F).sql
--   2. Test on a staging DB first.
--   3. Wrap destructive DDL in BEGIN/EXCEPTION blocks to fail soft.
--   4. NEVER drop a table that still has live FK references — drop
--      the FKs first.
-- ============================================================

BEGIN;

-- Example: reverse an ALTER TABLE ADD COLUMN
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = '<table>' AND column_name = '<column>'
--   ) THEN
--     ALTER TABLE public.<table> DROP COLUMN <column>;
--   END IF;
-- END $$;

-- Example: reverse a CREATE TABLE
-- DROP TABLE IF EXISTS public.<table> CASCADE;

-- Example: reverse an RLS policy
-- DROP POLICY IF EXISTS "<policy_name>" ON public.<table>;

-- TODO: replace the examples above with the actual rollback DDL.

COMMIT;
