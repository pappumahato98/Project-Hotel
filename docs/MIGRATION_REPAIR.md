# Migration Repair & Rollback Workflow

## Problem

The repo has **32 timestamped SQL migrations** in `supabase/migrations/` with no
rollback/down migrations and no repair tooling. The Supabase CLI does not natively
support `migration down`. When a migration is bad or was applied out-of-band, the
team had no documented recovery path.

## Solution

This PR adds three things:

1. **`supabase/migrations/down/` directory** for rollback SQL files, with a
   `_template_down.sql` showing the safe-rollback pattern (BEGIN/COMMIT,
   information_schema guards, FK-aware DROP order).
2. **`scripts/migration-tools/repair-migrations.js`** — a Node CLI that:
   - `list` — shows pending vs. applied migrations and which have rollbacks.
   - `repair <name>` — marks a migration as applied in
     `supabase_migrations.schema_migrations` without running its SQL.
   - `rollback <name>` — runs the matching down-migration in a transaction,
     then deletes the row from `schema_migrations`.
3. **npm scripts**: `pnpm migrations:list`, `pnpm migrations:repair <name>`,
   `pnpm migrations:rollback <name>`.

## Prerequisites

```bash
pnpm add -D pg @types/pg   # already added to package.json in this PR
```

Set one of:
- `SUPABASE_DB_URL=postgres://user:pass@host:5432/db`
- or `PGHOST= PGPORT= PGUSER= PGPASSWORD= PGDATABASE=`

## Usage

### See what's applied and what's pending

```bash
pnpm migrations:list
```

Output:
```
Migrations:
  [P] pending  [A] applied  [R] has rollback
  [AR] 20251221133958_06e48390-897e-4fd9-a812-d4934881247f.sql
  [A ] 20251222065452_42323bea-61d7-41bd-bd5b-9b26c3efdc63.sql
  ...
32 total · 30 applied · 2 pending

Migrations without rollback (30):
  - 20251221133958_06e48390-897e-4fd9-a812-d4934881247f.sql
  - ...
```

### Repair a migration that was applied manually

Use this when you ran a migration via `psql` (e.g. hotfix on staging) and now
the CLI thinks it's still pending.

```bash
pnpm migrations:repair 20260424000000_pos_partial_payments
```

### Roll back a bad migration

First write a down-migration file:

```bash
cp supabase/migrations/down/_template_down.sql \
   supabase/migrations/down/20260424000000_pos_partial_payments.down.sql
# edit the file with the correct reverse DDL
```

Then run:

```bash
pg_dump "$SUPABASE_DB_URL" > backup_$(date +%F).sql   # ALWAYS BACK UP FIRST
pnpm migrations:rollback 20260424000000_pos_partial_payments
```

The script wraps the down-migration in a transaction. If any statement fails,
the whole rollback aborts and the `schema_migrations` row stays intact.

## Authoring a new down-migration

1. Copy the template: `cp supabase/migrations/down/_template_down.sql <name>.down.sql`
2. Fill in the reverse DDL using these patterns:
   - **Reverse ADD COLUMN:** wrap in `IF EXISTS` information_schema check.
   - **Reverse CREATE TABLE:** `DROP TABLE IF EXISTS ... CASCADE` (only after
     dropping inbound FKs).
   - **Reverse CREATE INDEX:** `DROP INDEX IF EXISTS ...`.
   - **Reverse CREATE POLICY:** `DROP POLICY IF EXISTS ... ON ...`.
   - **Reverse INSERT (seed data):** `DELETE FROM ... WHERE <exact match>`.
3. Test on a staging DB: `pnpm migrations:rollback <name>`.
4. Commit the `.down.sql` alongside the original migration in the same PR.

## Conventions

- Down-migration filenames: `<original_migration_basename>.down.sql` (note the `.down.sql` suffix).
- The matcher also accepts `_down.sql` suffix and bare basename.
- The template file `_template_down.sql` is excluded from the rollback listing.
- Always wrap the body in `BEGIN; ... COMMIT;` so the script's outer transaction has a clean inner boundary.

## What this PR deliberately does NOT do

- It does not retroactively write down-migrations for the existing 32 migrations.
  That's a separate, careful exercise per migration. The infrastructure is now
  in place to do so incrementally.
- It does not run on Lovable Cloud (where Supabase CLI handles migrations).
  The tool is for self-hosted / dev environments only.
