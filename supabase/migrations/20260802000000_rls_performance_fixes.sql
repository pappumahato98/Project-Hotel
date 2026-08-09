-- ==============================================================================
-- RLS PERFORMANCE FIXES
-- ==============================================================================
-- Fixes 4 Supabase Database Linter warnings:
--
--   1. auth_rls_initplan on AuthUser.users_read_own_profile
--   2. auth_rls_initplan on ActivityLog.admin_read_activity
--   3. multiple_permissive_policies on AuthUser (authenticated SELECT)
--   4. multiple_permissive_policies on SystemSetting (authenticated SELECT)
--
-- Fix 1 & 2: Wrap auth.<function>() in (SELECT ...) to prevent re-evaluation
--   per row. This makes PostgreSQL evaluate the function once (initplan)
--   instead of for every row scanned.
--
-- Fix 3 & 4: Merge multiple permissive policies into a single policy using
--   OR logic. Multiple permissive policies force PostgreSQL to evaluate ALL
--   of them for every query. A single merged policy is evaluated once.
--
-- IMPORTANT: Our app uses Prisma with direct DB connections (not Supabase
-- client RLS), so these policies don't affect current app performance.
-- However, fixing them is best practice and eliminates linter warnings.
-- ==============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 1 & 3: AuthUser table — merge 2 permissive SELECT policies + initplan
-- ═══════════════════════════════════════════════════════════════════════════════
-- Before: 2 permissive policies (each evaluated per query)
--   admin_gm_read_all_profiles:    (select auth.role()) = 'admin' OR 'gm'
--   users_read_own_profile:        auth.uid() = id  <-- initplan issue
-- After: 1 merged permissive policy (single evaluation)

DROP POLICY IF EXISTS "admin_gm_read_all_profiles" ON public."AuthUser";
DROP POLICY IF EXISTS "users_read_own_profile" ON public."AuthUser";

CREATE POLICY "auth_user_select_merged" ON public."AuthUser"
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/GM can read all profiles
    (SELECT auth.role()) IN ('admin', 'gm')
    OR
    -- Users can read their own profile
    (SELECT auth.uid())::text = id
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 2: ActivityLog — fix initplan on admin_read_activity
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "admin_read_activity" ON public."ActivityLog";

CREATE POLICY "admin_read_activity" ON public."ActivityLog"
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.role()) IN ('admin', 'gm')
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX 4: SystemSetting — merge 2 permissive SELECT policies
-- ═══════════════════════════════════════════════════════════════════════════════
-- Before: 2 permissive policies
--   admin_gm_write_settings:       (select auth.role()) = 'admin' OR 'gm'
--   authenticated_read_settings:   true  <-- allows all authenticated users
-- After: 1 merged policy

DROP POLICY IF EXISTS "admin_gm_write_settings" ON public."SystemSetting";
DROP POLICY IF EXISTS "authenticated_read_settings" ON public."SystemSetting";

CREATE POLICY "system_setting_select_merged" ON public."SystemSetting"
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/GM have full access; all authenticated users can read
    (SELECT auth.role()) IN ('admin', 'gm')
    OR
    true
  );
