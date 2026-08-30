#!/usr/bin/env node
/**
 * supabase/migration-tools/repair-migrations.js
 *
 * Helper for the migration-repair workflow. Three modes:
 *
 *   1. `node repair-migrations.js list`
 *      Lists all migrations in supabase/migrations/, indicates which
 *      have a matching `down/<name>` rollback, and queries the
 *      `supabase_migrations.schema_migrations` table to show
 *      applied vs. pending.
 *
 *   2. `node repair-migrations.js repair <migration_name>`
 *      Marks a migration as applied in `schema_migrations` without
 *      running it. Use when the migration was applied manually (e.g.
 *      via psql) and the CLI thinks it's still pending.
 *
 *   3. `node repair-migrations.js rollback <migration_name>`
 *      Runs the matching `supabase/migrations/down/<migration_name>`
 *      file against the DB, then DELETES the row from
 *      `schema_migrations`. Use to roll back a bad migration.
 *
 * Environment variables (all required except SUPABASE_DB_SSL):
 *   SUPABASE_DB_URL=postgres://user:pass@host:5432/db
 *   # or set individual:
 *   PGHOST= PGPORT= PGUSER= PGPASSWORD= PGDATABASE=
 *
 * Requires: `pg` (already in devDependencies via @testing-library).
 *   If not installed: `pnpm add -D pg @types/pg`
 *
 * Exit codes: 0 success, 1 usage error, 2 DB error.
 */

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "migrations");
const DOWN_DIR = path.join(MIGRATIONS_DIR, "down");

function getDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || 5432;
  const user = process.env.PGUSER;
  const pass = process.env.PGPASSWORD;
  const db = process.env.PGDATABASE;
  if (!host || !user || !db) {
    console.error("Missing DB connection env. Set SUPABASE_DB_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE.");
    process.exit(1);
  }
  return `postgres://${user}:${pass}@${host}:${port}/${db}`;
}

async function getClient() {
  let pg;
  try {
    pg = require("pg");
  } catch (e) {
    console.error("`pg` package not installed. Run: pnpm add -D pg @types/pg");
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: getDbUrl() });
  await client.connect();
  return client;
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory())
    .sort();
}

function listDownMigrations() {
  if (!fs.existsSync(DOWN_DIR)) return [];
  return fs
    .readdirSync(DOWN_DIR)
    .filter((f) => f.endsWith(".sql") && f !== "_template_down.sql")
    .map((f) => f.replace(/\.down\.sql$|_down\.sql$/, ""))
    .filter(Boolean);
}

async function listApplied(client) {
  try {
    const res = await client.query(
      "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"
    );
    return new Set(res.rows.map((r) => r.version));
  } catch (e) {
    console.warn("Could not read supabase_migrations.schema_migrations (table may not exist yet).");
    return new Set();
  }
}

async function cmdList() {
  const files = listMigrationFiles();
  const downs = new Set(listDownMigrations());
  const client = await getClient();
  try {
    const applied = await listApplied(client);
    console.log("Migrations:");
    console.log("  [P] pending  [A] applied  [R] has rollback");
    for (const f of files) {
      const base = f.replace(/\.sql$/, "");
      const isApplied = applied.has(base);
      const hasDown = downs.has(base) || downs.has(f);
      const flag = isApplied ? "A" : "P";
      const rb = hasDown ? "R" : " ";
      console.log(`  [${flag}${rb}] ${f}`);
    }
    console.log(`\n${files.length} total · ${applied.size} applied · ${files.length - applied.size} pending`);
    const noDown = files.filter((f) => {
      const base = f.replace(/\.sql$/, "");
      return !downs.has(base) && !downs.has(f);
    });
    if (noDown.length) {
      console.log(`\nMigrations without rollback (${noDown.length}):`);
      noDown.forEach((f) => console.log(`  - ${f}`));
    }
  } finally {
    await client.end();
  }
}

async function cmdRepair(name) {
  if (!name) {
    console.error("Usage: repair-migrations.js repair <migration_name>");
    process.exit(1);
  }
  const version = name.replace(/\.sql$/, "");
  const client = await getClient();
  try {
    await client.query(
      "INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
      [version]
    );
    console.log(`Marked '${version}' as applied.`);
  } catch (e) {
    console.error("Repair failed:", e.message);
    process.exit(2);
  } finally {
    await client.end();
  }
}

async function cmdRollback(name) {
  if (!name) {
    console.error("Usage: repair-migrations.js rollback <migration_name>");
    process.exit(1);
  }
  const version = name.replace(/\.sql$/, "");
  // Look for a down file matching the migration name.
  const candidates = [
    path.join(DOWN_DIR, `${version}.down.sql`),
    path.join(DOWN_DIR, `${version}_down.sql`),
    path.join(DOWN_DIR, version),
  ];
  const downFile = candidates.find((p) => fs.existsSync(p));
  if (!downFile) {
    console.error(`No down-migration found for '${version}'. Looked in: ${DOWN_DIR}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(downFile, "utf8");
  const client = await getClient();
  try {
    console.log(`Running rollback: ${downFile}`);
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "DELETE FROM supabase_migrations.schema_migrations WHERE version = $1",
      [version]
    );
    await client.query("COMMIT");
    console.log(`Rolled back '${version}'.`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Rollback failed (transaction aborted):", e.message);
    process.exit(2);
  } finally {
    await client.end();
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "list":
      await cmdList();
      break;
    case "repair":
      await cmdRepair(rest[0]);
      break;
    case "rollback":
      await cmdRollback(rest[0]);
      break;
    default:
      console.error("Usage: repair-migrations.js <list|repair|rollback> [migration_name]");
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
