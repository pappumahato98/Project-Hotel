# Migration Progress — Sprint 4 Complete

> Companion to `docs/REMEDIATION_PLAYBOOK.md`. Tracks the actual migration
> progress across all continuation rounds.

## Verification status (final)

| Check | Status |
|---|---|
| `pnpm install` | ✅ succeeds |
| `npx tsc --noEmit` | ✅ zero type errors across entire codebase |
| `npx vitest run` | ✅ **149/149 tests pass** (8 finance modules + 3 regression suites) |
| `npx vite build` | ✅ builds in ~14s (only pre-existing chunk-size warning) |
| `npx eslint .` | ✅ zero `no-restricted-imports` violations |

## #5 — queryKeys factory migration — COMPLETE ✅

- **42/42 hooks migrated** to the central `queryKeys` factory.
- **0 inline `queryKey: ["..."]` literals** remain in `src/hooks/*.ts`.
- **Regression test** at `src/__tests__/no-inline-query-keys.test.ts` prevents re-introduction.
- Generic codemod at `scripts/migration-tools/migrate-querykeys.cjs` for any future drift.

## #2 — Toast migration — COMPLETE ✅

- **All 18 call sites migrated** (8 hooks + 9 components + 1 page).
- **4 legacy files deleted** (`use-toast.ts`, `ui/toast.tsx`, `ui/toaster.tsx`, `ui/use-toast.ts`).
- **`<Toaster />` mount removed** from `src/App.tsx`.
- **ESLint `no-restricted-imports` rule** bans re-introduction at lint time.
- **3 regression tests** at `src/__tests__/no-legacy-toast*.test.ts` prevent re-creation of deleted files and references.
- **Bonus bug fix:** `APTransactionService.tsx` was calling `toast.success(...)` without importing `toast` — would have thrown a ReferenceError at runtime. Fixed as part of the split.

## #3 — Finance service split — 8/26 done

### Worked examples shipped

| # | Service | LOC before | Service file | Hook file | Tests |
|---|---|---|---|---|---|
| 1 | `LedgerTransactionService` | 398 | 213 lines | 169 lines | 20 tests |
| 2 | `CashBankReconcileService` | 293 | 148 lines | 142 lines | 23 tests |
| 3 | `TaxCalculationService` | 84 | 95 lines | 42 lines | 18 tests |
| 4 | `BudgetExecutionService` | 115 | 105 lines | 45 lines | 16 tests |
| 5 | `ApprovalWorkflowService` | 126 | 85 lines | 87 lines | 13 tests |
| 6 | `LedgerInquiryService` | 114 | 123 lines | 56 lines | 22 tests |
| 7 | `ARTransactionService` | 152 | 117 lines | 47 lines | 14 tests |
| 8 | `APTransactionService` | 182 | 110 lines | 62 lines | 15 tests |

**Total: 141 unit tests across 8 finance service modules.** All follow the canonical three-layer pattern documented in `docs/FINANCE_SERVICE_SPLIT.md`:

- `src/lib/finance/<domain>Service.ts` — pure functions, zero React imports
- `src/hooks/finance/use<Domain>View.ts` — state + data fetching, delegates to service
- `src/components/finance/transactions/<Domain>Service.tsx` (or `reporting/`) — presentation only, zero `useMemo`
- `src/lib/finance/__tests__/<domain>Service.test.ts` — Vitest unit tests

### Reuse emerging

The 8 split services now share patterns and helpers that the next 18 can build on:
- `computeXxxSummary` naming convention for aggregation functions
- `isBalanced` / `BALANCED_THRESHOLD` for floating-point-safe comparisons
- `selectActiveXxx` for "first matching item or fallback" patterns
- `partitionByStatus` for bucket-partitioning collections
- `getXxxStatusBadgeClass` for status → Tailwind class mappings (AR + AP siblings)
- `formatDollar` appears in both AR and AP — promote to `src/lib/finance/shared.ts` if a third service needs it
- `formatAmount` / `formatBalance` in LedgerInquiry, `formatDollar` in AR/AP — same pattern, candidate for shared.ts

When the next finance service is split, look for similar reuse opportunities. If two services share a helper, extract to `src/lib/finance/shared.ts`.

### Remaining 18 services

Per the prioritized list in `docs/FINANCE_SERVICE_SPLIT.md`. Next candidates:
1. `BankCashTransactionService.tsx` — likely shares patterns with `CashBankReconcileService`
2. `JournalManagementService.tsx` — likely shares patterns with `LedgerTransactionService`
3. `AssetOperationsService.tsx` — distinct domain (fixed assets)
4. `DayBookService.tsx` — likely a date-filtered journal view
5. The 11 `setup/*Service.tsx` files (mostly CRUD wrappers — likely quick splits)
6. The 10 `reporting/*Service.tsx` files (mostly read-only views — likely quick splits)

At 1 PR per service and ~3 services per week, the long tail is ~6 weeks.

## Bonus bug fixes (this round)

1. **`APTransactionService.tsx` missing `toast` import** — the original component called `toast.success(...)` without importing `toast` from `sonner`, which would throw a `ReferenceError: toast is not defined` at runtime when the user clicked "Upload invoice". Fixed by the split (the hook now imports `toast` properly).
2. **`ledgerInquiryService.searchLedgerEntries` whitespace handling** — the initial implementation returned the input array only for the empty string `""`, not for whitespace-only strings. Fixed to treat whitespace-only queries as no-ops, matching the test expectation.
3. **Regression test self-reference** — `no-legacy-toast.test.ts` was triggering itself as a violation because it references `useToast` in its scanning patterns. Added the test file to its own `ALLOWED` list with a comment explaining why.

## Regression test suite — STABLE

Three test files in `src/__tests__/` enforce the migration invariants going forward:

| Test file | What it enforces |
|---|---|
| `no-inline-query-keys.test.ts` | No `queryKey: ["..."]` literals in `src/hooks/*.ts` |
| `no-legacy-toast.test.ts` | No `useToast()` calls or `@/hooks/use-toast` imports anywhere in `src/` (except itself) |
| `no-legacy-toast-files.test.ts` | The 4 deleted legacy files don't get re-created |

These run as part of `pnpm vitest run` and will fail any PR that re-introduces the patterns we just removed.

## Updated sprint plan

| Sprint | Scope | Status |
|---|---|---|
| **Sprint 1** | Quick wins: README sync, .gitignore, lockfiles, queryKeys factory + 2 refs, toast deprecation markers, migration repair scaffolding, finance split worked example #1 | ✅ Done |
| **Sprint 2a** | Verify worked example compiles + tests pass; batch-migrate 13 more hooks to `queryKeys`; migrate all 8 hooks off `useToast` | ✅ Done |
| **Sprint 2b** | Migrate remaining 27 hooks to `queryKeys` via generic codemod; migrate 9 component files off `useToast` via generic codemod; delete legacy toast files; finance split worked example #2 | ✅ Done |
| **Sprint 3** | Split 3 more finance services; add 3 regression test suites; wire ESLint `no-restricted-imports` rule | ✅ Done |
| **Sprint 4** (this round) | Split 3 more finance services (`LedgerInquiryService`, `ARTransactionService`, `APTransactionService`); fix `APTransactionService` missing-toast-import bug | ✅ Done |
| **Sprint 5** (next) | Split next 3 finance services (recommend `BankCashTransactionService` + `JournalManagementService` + `DayBookService`) | Pending |
| **Sprint 6+** | Finish finance service split long tail (15 remaining); MCP hardening; down-migrations for stable SQL | Pending |

## Confidence

The build is green, typecheck is clean, **149 unit tests pass** (141 finance-domain + 8 regression), and ESLint enforces the toast-import ban. The migration patterns are proven at full scale across all three tracks:

- **queryKeys factory**: 42/42 hooks migrated, regression-tested
- **Toast migration**: 18/18 call sites migrated, 4 files deleted, regression-tested + lint-enforced, runtime bug fixed
- **Finance split**: 8/26 services split with 141 unit tests covering pure business logic

The remaining work is now demonstrably mechanical and low-risk. The codemods and regression tests are reusable for any future drift.
