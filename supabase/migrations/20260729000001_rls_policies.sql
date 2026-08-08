-- ─── Supabase Row Level Security (RLS) Policies ──────────────
--
-- Defense-in-depth: the primary authorization is in the Next.js API
-- routes (requireAuth + requireRole). RLS provides a secondary layer.
--
-- Prisma connects with the service role key (bypasses RLS), so these
-- policies only affect direct Postgres / Supabase client queries.

-- Helper function: get the current user's role from the AuthUser table
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public."AuthUser" where id = auth.uid()::text limit 1;
$$;

-- Helper: is the current user an admin or GM?
create or replace function public.is_admin_or_gm()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_user_role() in ('admin', 'gm');
$$;

-- Revoke anon execute on SECURITY DEFINER functions (not meant for public access)
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon IF EXISTS;

-- AuthUser (profiles): users can read their own; admin/GM can read all
alter table public."AuthUser" enable row level security;
create policy "users_read_own_profile" on public."AuthUser" for select to authenticated using (id = auth.uid()::text);
create policy "admin_gm_read_all_profiles" on public."AuthUser" for select to authenticated using (public.is_admin_or_gm());

-- Sensitive tables
alter table public."SystemSetting" enable row level security;
create policy "authenticated_read_settings" on public."SystemSetting" for select to authenticated using (true);
create policy "admin_gm_write_settings" on public."SystemSetting" for all to authenticated using (public.is_admin_or_gm()) with check (public.is_admin_or_gm());

alter table public."SecurityEvent" enable row level security;
create policy "admin_gm_read_security" on public."SecurityEvent" for select to authenticated using (public.is_admin_or_gm());
create policy "admin_gm_insert_security" on public."SecurityEvent" for insert to authenticated with check (public.is_admin_or_gm());

alter table public."ActivityLog" enable row level security;
create policy "admin_read_activity" on public."ActivityLog" for select to authenticated using (public.is_admin_or_gm() or "userId" = auth.uid()::text);
create policy "user_insert_own_activity" on public."ActivityLog" for insert to authenticated with check ("userId" = auth.uid()::text);
