# LuxeStay ERP — Remediation Playbook

> Companion to the architecture blueprint. Covers all 10 observations with
> (A) expanded remediation plans and (B) a prioritized backlog with sprint plan.
> (C) applied fixes and (D) the finance-service split worked example are
> documented in their own files; this playbook references them.

---

## Part A — Expanded Remediation Plans

Each observation gets:
- **Root cause** — why it happened
- **Fix steps** — concrete, ordered, with file paths
- **Diff sketch** — illustrative code
- **Verification** — how to know it worked
- **C-status** — ✅ done in this PR · ⏳ partial · 🔲 not started

---

### #1 — README is stale (claims "dark navy + gold", code says "Digital Blue + Cyan")

**Root cause.** Design system was migrated mid-project; README was not updated. The README's "Design System" section contradicts `src/index.css` and `tailwind.config.ts`, misleading new contributors and any tool that ingests the README (LLM agents, doc generators, screenshot bots).

**Fix steps.**
1. Replace the entire "Design System" section in `README.md`.
2. Use canonical HSL → HEX values from `src/index.css` (light + dark).
3. Document the runtime-injection layer (`DesignSystemProvider`).
4. Cross-link to `tailwind.config.ts` and `index.css` as source of truth.

**Verification.**
- `grep -i 'gold\|hsl(38' README.md` returns nothing.
- `grep 'Digital Blue' README.md` returns ≥1 hit.
- A new contributor can pick a brand color from the README without opening code.

**C-status.** ✅ Done. See `README.md` lines 134–191.

---

### #2 — Dual toast system (`useToast` + `sonner`)

**Root cause.** `sonner` was adopted later in the project's life. Older hooks kept the original Radix-based `useToast`. Both `<Toaster />` (Radix) and `<Sonner />` are mounted in `App.tsx`, so users see two different toast UXs depending on which code path fires.

**Fix steps.**
1. Mark `src/hooks/use-toast.ts` `@deprecated` with migration instructions.
2. Add a dev-only `console.warn` in `useToast()` so call sites surface in the browser console.
3. Write `docs/TOAST_MIGRATION.md` listing all 18 call sites with a translation table and codemod.
4. Migrate 8 hooks → 9 components → 1 page in three batches over 3 weeks.
5. After migration: delete `use-toast.ts`, `toaster.tsx`, `toast.tsx`; remove `<Toaster />` from `App.tsx`; add ESLint `no-restricted-imports` rule to ban re-introduction.

**Diff sketch** (per call site):
```diff
- import { useToast } from "@/hooks/use-toast";
+ import { toast } from "sonner";
...
- const { toast } = useToast();
- toast({ title: "Saved", description: "x" });
+ toast.success("Saved", { description: "x" });
```

**Verification.**
- `grep -r 'useToast\|use-toast' src/` returns only the file itself (during migration) and zero hits (after).
- `pnpm build` succeeds with no new type errors.
- Manual exercise of each migrated call site: success, error, description-bearing, promise-style.

**C-status.** ⏳ Partial. Deprecation markers + migration doc + codemod shipped in this PR. The 18-file migration itself is a 3-week rollout (each file = 1 PR).

---

### #3 — Finance `*Service.tsx` monoliths (26 files)

**Root cause.** Finance module was built component-first, with each "service" being a single React component mixing business logic, data fetching, and presentation. No unit tests because the logic cannot be extracted without React.

**Fix steps** (per service — see `docs/FINANCE_SERVICE_SPLIT.md` for the full RFC).
1. Extract pure functions into `src/lib/finance/<domain>Service.ts` (zero React imports).
2. Extract a hook `src/hooks/finance/use<Domain>View.ts` that owns state + data fetching and delegates computation to the service.
3. Refactor the original component to consume the hook; remove all `useMemo` calls (move to hook or service).
4. Write unit tests in `src/lib/finance/__tests__/<domain>Service.test.ts`.
5. Keep the public component export name unchanged.

**Diff sketch** — see `docs/FINANCE_SERVICE_SPLIT.md` "Worked example" section. The 398-line `LedgerTransactionService.tsx` is split into:
- `src/lib/finance/ledgerService.ts` (158 lines, pure)
- `src/hooks/finance/useLedgerTransactionView.ts` (134 lines, state + data)
- `src/components/finance/transactions/LedgerTransactionService.tsx` (~370 lines, JSX only)
- `src/lib/finance/__tests__/ledgerService.test.ts` (160 lines, 17 tests)

**Verification.**
- `grep 'useMemo' src/components/finance/transactions/LedgerTransactionService.tsx` returns 0 hits (modulo doc comment).
- `pnpm vitest run src/lib/finance/__tests__/ledgerService.test.ts` passes 17 tests.
- `pnpm build` succeeds.
- Manual smoke test of the Ledger tab passes (filter sidebar, details mode, summary mode, linked-ledger filter).

**C-status.** ⏳ Partial. Worked example shipped (1/26 services). Migration plan + 5 recommended next targets documented.

---

### #4 — `vite.config.ts.timestamp-*.mjs` committed

**Root cause.** Vite's SWC plugin occasionally writes a timestamped cache file to the repo root. Without a `.gitignore` rule, it gets committed.

**Fix steps.**
1. Add `*.timestamp-*.mjs` to `.gitignore`.
2. Also add `.vite`, `*.tsbuildinfo`, `coverage`, `.nyc_output` while we're here.
3. `git rm --cached vite.config.ts.timestamp-*.mjs` (or just delete the file from the working tree).

**Verification.**
- `git status` no longer shows the file as tracked.
- After running `pnpm dev`, the timestamp file appears on disk but `git status` shows it as ignored.

**C-status.** ✅ Done. See `.gitignore` lines 15–18.

---

### #5 — Inline query-key magic strings

**Root cause.** 50+ hooks each spell their own `queryKey: ["..."]` and `invalidateQueries({ queryKey: ["..."] })` as inline literals. Typos and silent drift cause realtime invalidations to miss cache entries → stale UI. Cross-module invalidation cascades (e.g. a reservation mutation must invalidate folios, invoices, rooms, housekeeping, reports) are particularly error-prone.

**Fix steps.**
1. Create `src/lib/queryKeys.ts` — a centralized factory with one namespace per domain (`queryKeys.reservations.all`, `queryKeys.finance.ledger.byAccount(id, filters)`, etc.).
2. Migrate `useReservations.ts` and `useFinance.ts` as worked examples.
3. Write a custom ESLint rule `scripts/eslint-rules/prefer-query-keys-factory.js` that flags inline `queryKey: ["..."]` literals.
4. Migrate the remaining ~48 hooks one PR at a time (mechanical, low risk).
5. After migration: enable the ESLint rule as `error` to prevent regression.

**Diff sketch:**
```diff
- queryKey: ["reservations"],
+ queryKey: queryKeys.reservations.all,
...
- queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
+ queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
```

**Verification.**
- `grep -rE 'queryKey:\s*\["' src/hooks/` returns 0 hits (after full migration).
- Realtime subscriptions still trigger cascading invalidations (manual test on a dev DB).
- ESLint rule catches new inline keys in CI.

**C-status.** ⏳ Partial. Factory + 2 reference migrations + ESLint rule shipped. The remaining ~48 hooks need incremental migration (1 PR per hook, ~5 min each).

---

### #6 — Manual chunk strategy is sound (positive observation)

**Root cause.** N/A — this is a positive note. The `vite.config.ts` `manualChunks` callback correctly separates `vendor-export` (jspdf, xlsx, html2canvas), `vendor-charts` (recharts, d3), `vendor-backend` (@supabase, @tanstack/react-query), and `vendor` (everything else). `chunkSizeWarningLimit: 1000` keeps the build inspectable.

**Fix steps.** None required. Optional enhancements:
1. Add `framer-motion` to its own chunk (it's ~50KB and used on every page).
2. Add `@radix-ui/*` to a `vendor-radix` chunk (currently mixed into `vendor`).
3. Consider `build.target: 'es2020'` to ship slightly smaller output (drops polyfills for older browsers — verify browser-support requirements first).

**Verification.**
- `pnpm build` produces ≤5 vendor chunks.
- Each chunk < 500KB gzipped.

**C-status.** 🔲 Not started (optional). Currently fine as-is.

---

### #7 — Three lockfiles committed (`bun.lock`, `package-lock.json`, `pnpm-lock.yaml`)

**Root cause.** Three package managers were used at different times; no contributor cleaned up. This causes: (a) CI ambiguity — which lockfile is canonical? (b) `pnpm install` warnings about foreign lockfiles, (c) merge conflicts when contributors use different managers.

**Fix steps.**
1. Decide: README says `pnpm` → keep `pnpm-lock.yaml`.
2. `git rm bun.lock package-lock.json`.
3. Add `bun.lock` and `package-lock.json` to `.gitignore` so they don't sneak back.
4. Document the choice in `CONTRIBUTING.md` (or `README.md` Contributing section).
5. Consider adding `packageManager: "pnpm@9.x"` to `package.json` (Corepack will enforce it).

**Verification.**
- `ls *lock*` returns only `pnpm-lock.yaml`.
- `git status` after `pnpm install` shows a clean tree.
- `corepack enable && pnpm install` works on a fresh clone.

**C-status.** ✅ Done. Lockfiles removed; `.gitignore` updated. (Corepack `packageManager` field not added — left as a follow-up since it changes contributor workflow.)

---

### #8 — 32 SQL migrations with no rollback path

**Root cause.** Supabase migrations are forward-only by default. The team never wrote down-migrations or a repair procedure. When a migration is bad or applied out-of-band (e.g. via `psql` hotfix on staging), there's no documented recovery.

**Fix steps.**
1. Create `supabase/migrations/down/` directory with a `_template_down.sql` showing safe-rollback patterns (BEGIN/COMMIT, `information_schema` guards, FK-aware DROP order).
2. Write `scripts/migration-tools/repair-migrations.js` — a Node CLI with three modes:
   - `list` — shows pending vs. applied + which have rollbacks.
   - `repair <name>` — marks a migration as applied in `schema_migrations` without running it.
   - `rollback <name>` — runs the matching down-migration in a transaction, then deletes the row from `schema_migrations`.
3. Add npm scripts: `pnpm migrations:list`, `pnpm migrations:repair`, `pnpm migrations:rollback`.
4. Add `pg` + `@types/pg` to devDependencies.
5. Write `docs/MIGRATION_REPAIR.md` documenting the workflow.
6. Incrementally author down-migrations for the 32 existing migrations (one PR per migration, optional but recommended for the most recent 5–10).

**Verification.**
- `pnpm migrations:list` connects to a dev DB and lists all 32 migrations with status.
- `pnpm migrations:rollback <name>` runs a down-migration in a transaction and rolls back on error.
- `pnpm migrations:repair <name>` marks a migration as applied.

**C-status.** ⏳ Partial. Infrastructure shipped (template + script + npm scripts + doc). The 32 down-migrations themselves are an incremental exercise (not in scope for this PR).

---

### #9 — Self-hosting story is excellent (positive observation)

**Root cause.** N/A — positive note. `docker-compose.yml` brings up the entire Supabase stack (Postgres, GoTrue, PostgREST, Realtime, Storage, Kong, Edge Runtime, Caddy, Redis, Inbucket) with one command. `docs/SELF_HOSTING.md` exists. The `lib/config.ts` dual-mode layer (`'lovable' | 'selfhosted'`) is clean.

**Fix steps.** None required. Optional enhancements:
1. Add a `Makefile` with `make up`, `make down`, `make logs`, `make psql`, `make seed`, `make backup`, `make restore` targets that wrap the docker-compose commands.
2. Add a `docker/dev.Dockerfile` for the frontend so contributors don't need Node installed locally.
3. Add `supabase seed.sql` with anonymized sample data for demoing.
4. Add a `make reset-db` target that drops + recreates the public schema (calls the repair-migrations tool).

**Verification.**
- `docker compose up -d` brings all 11 services to `healthy` within 60 seconds.
- `curl http://localhost:8000/auth/v1/health` returns 200.

**C-status.** 🔲 Not started (optional enhancements). Currently excellent.

---

### #10 — MCP integration is unusual but forward-looking

**Root cause.** The project ships `mcp.json`, a `20260208170000_mcp_setup.sql` migration, and `components/dev/MCPConfig.tsx` — exposing the app to LLM agents via Model Context Protocol. This is unusual for a hospitality ERP but not wrong.

**Fix steps.** None required (this is a judgment call, not a defect). Recommended hardening:
1. **Auth-gate MCP endpoints.** The migration should require an admin role; verify RLS policies.
2. **Rate-limit MCP tools.** An LLM agent can spam RPC calls; add per-user/per-tool rate limits in Kong or an edge function.
3. **Audit-log every MCP call.** Extend `utils/auditLogger.ts` to record tool name, args, caller, response status.
4. **Document the exposed surface.** Write `docs/MCP.md` listing every tool, its args, its auth requirement, and its risk profile.
5. **Add a kill-switch.** A `ui_preferences.mcp_enabled` flag (default false) that the `MCPConfig` component respects, so MCP can be disabled per-tenant without a code deploy.
6. **Pen-test before prod.** Run an automated scanner against the MCP endpoints (e.g. `nuclei` templates) before enabling in production.

**Verification.**
- `grep 'mcp_enabled' src/` returns the flag usage.
- `docs/MCP.md` exists and lists all tools.
- Audit log shows MCP calls with caller identity.
- Rate limit returns 429 when an agent exceeds the limit.

**C-status.** 🔲 Not started (hardening RFC). MCP itself is working as designed.

---

## Part B — Prioritized Backlog

### Scoring rubric

Each item is scored on three axes (1–5):

- **Impact** — How much does fixing this improve the codebase? (5 = critical bug, 1 = nice-to-have)
- **Effort** — How many engineer-hours? (5 = >1 week, 1 = <1 hour)
- **Risk** — How likely is the fix to introduce a regression? (5 = high, 1 = very low)

**Priority = Impact × (6 − Effort) × (6 − Risk)** — higher is more worth doing.

### Scoring table

| # | Observation | Impact | Effort | Risk | Priority | Bucket |
|---|---|---:|---:|---:|---:|---|
| 4 | Vite timestamp file committed | 2 | 1 | 1 | **10** | Quick Win |
| 7 | Three lockfiles committed | 3 | 1 | 1 | **15** | Quick Win |
| 1 | README stale | 3 | 1 | 1 | **15** | Quick Win |
| 5 | Inline query keys (factory + 2 migrations) | 4 | 2 | 2 | **24** | Quick Win |
| 2 | Dual toast (deprecation + plan) | 3 | 2 | 2 | **18** | Quick Win |
| 8 | Migration repair scaffolding | 3 | 3 | 2 | **18** | Quick Win |
| 5 | Inline query keys (full 48-hook migration) | 4 | 4 | 2 | **16** | Mid-term |
| 2 | Dual toast (full 18-file migration) | 3 | 4 | 2 | **12** | Mid-term |
| 3 | Finance service split (1/26 worked example) | 4 | 3 | 2 | **24** | Quick Win |
| 3 | Finance service split (remaining 25 services) | 5 | 5 | 3 | **10** | Strategic |
| 8 | Author down-migrations for 32 existing migrations | 2 | 5 | 3 | **4** | Strategic |
| 6 | (Optional) chunk strategy polish | 1 | 2 | 1 | **4** | Optional |
| 9 | (Optional) self-hosting Makefile + Dockerfile | 2 | 3 | 1 | **8** | Optional |
| 10 | MCP hardening (auth + rate-limit + audit) | 4 | 4 | 3 | **8** | Strategic |

### Impact × Effort matrix

```
EFFORT →
       1 (trivial)    2 (hours)        3 (day)         4 (week)         5 (multi-week)
IMPACT
 5     |              |                |                |                | #3 (25 svc) ⭐
 4     |              | #5 factory ⭐  | #3 (1 svc) ⭐  | #5 full         |
 3     | #1 ⭐ #7 ⭐  | #2 plan ⭐     | #8 scaff ⭐    | #2 full         |
 2     | #4 ⭐        | #6 opt         | #9 opt  #8 dn  | #10 hardening   |
 1     |              |                |                |                 |
```

⭐ = shipped in this PR · opt = optional · "full" = remaining work after this PR

### Recommended sprint plan

**Sprint 1 (Week 1) — Quick Wins, all shipped in this PR**
- ✅ #4 Vite timestamp gitignore
- ✅ #7 Lockfile dedupe
- ✅ #1 README sync
- ✅ #5 queryKeys factory + 2 reference migrations + ESLint rule
- ✅ #2 Toast deprecation markers + migration doc
- ✅ #8 Migration repair scaffolding
- ✅ #3 Finance service split — worked example (1/26)

**Sprint 2 (Weeks 2–3) — Mechanical migrations**
- 🔲 #5 Migrate remaining 48 hooks to `queryKeys` (1 PR per hook, ~5 min each, batch into 5 PRs of 10 hooks)
- 🔲 #2 Migrate 8 hooks + 9 components + 1 page off `useToast` (1 PR per file)
- 🔲 #3 Split next 2 finance services (recommend `LedgerInquiryService` + `CashBankReconcileService`)

**Sprint 3 (Weeks 4–5) — Higher-effort value**
- 🔲 #3 Split 3 more finance services (`TaxCalculationService`, `BudgetExecutionService`, `ApprovalWorkflowService`)
- 🔲 #6 (Optional) Add framer-motion + radix chunks to `vite.config.ts`
- 🔲 #9 (Optional) Self-hosting Makefile + dev.Dockerfile + seed.sql

**Sprint 4 (Weeks 6–8) — Strategic**
- 🔲 #3 Continue finance service split (target: 10 services done by end of Sprint 4)
- 🔲 #10 MCP hardening: auth-gate, rate-limit, audit-log, kill-switch, docs, pen-test
- 🔲 #8 Author down-migrations for the 5 most recent migrations (most likely to need rollback)

**Sprint 5+ (ongoing)**
- 🔲 #3 Finish remaining finance service splits (~13 weeks total at 2/week)
- 🔲 #8 Author down-migrations for the other 27 migrations (lower priority — most are stable)

### Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `queryKeys` migration introduces a typo that breaks invalidation | Medium | ESLint rule + manual smoke test of each migrated hook's realtime cascade |
| Toast migration changes toast position/stacking UX | High | Test each migrated call site; sonner position config may need adjustment |
| Finance service split breaks a consumer (e.g. `Finance.tsx` page) | Low | Keep public component export name unchanged; manual smoke test of each tab |
| Down-migration runs in prod by accident | High | Script wraps in BEGIN/COMMIT; require `SUPABASE_DB_URL` env; document "always backup first" |
| MCP hardening breaks existing agent integrations | Medium | Add `mcp_enabled` flag defaulting to current behavior; coordinate with agent users before enforcing auth |

### Owner & tracking

- **Owner:** frontend lead (Sprints 1–3) + backend lead (Sprint 4 #8 + #10)
- **Tracking:** GitHub Project board with columns `Backlog / Sprint N / In PR / Done`
- **Definition of Done per item:**
  - Code merged to `main`
  - Docs updated (`README.md`, `docs/*.md` as relevant)
  - Tests pass (`pnpm vitest`, `pnpm build`)
  - Manual smoke test signed off by reviewer
  - PR description links to this playbook

---

## Cross-references

| Doc | Covers |
|---|---|
| `README.md` (updated) | #1 — Design system section synced to actual tokens |
| `docs/TOAST_MIGRATION.md` | #2 — 18 call sites + codemod + translation table |
| `docs/FINANCE_SERVICE_SPLIT.md` | #3 — RFC + worked example for `LedgerTransactionService` |
| `docs/MIGRATION_REPAIR.md` | #8 — Repair/rollback workflow + tooling |
| `src/lib/queryKeys.ts` | #5 — Centralized query-key factory |
| `scripts/eslint-rules/prefer-query-keys-factory.js` | #5 — Lint rule to enforce the factory |
| `scripts/migration-tools/repair-migrations.js` | #8 — Repair/rollback CLI |
| `supabase/migrations/down/_template_down.sql` | #8 — Safe-rollback template |
| `src/lib/finance/ledgerService.ts` | #3 — Pure business-logic layer |
| `src/hooks/finance/useLedgerTransactionView.ts` | #3 — React hook wrapping the service |
| `src/lib/finance/__tests__/ledgerService.test.ts` | #3 — 17 unit tests for the service |
