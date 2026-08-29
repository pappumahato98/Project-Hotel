# Migration Progress — Sprint 6 Complete

> Companion to `docs/REMEDIATION_PLAYBOOK.md`. Tracks the actual migration
> progress across all continuation rounds.

## Verification status (final)

| Check | Status |
|---|---|
| `pnpm install` | ✅ succeeds (in frontend/) |
| `npx tsc --noEmit` | ✅ zero type errors |
| `npx vitest run` | ✅ **220/220 tests pass** (14 finance modules + 3 regression suites) |
| `npx vite build` | ✅ builds in ~15s |
| `npx eslint .` | ✅ zero `no-restricted-imports` violations |
| Vercel deployment | ✅ https://projecthotel-gold.vercel.app/ renders correctly |

## #5 — queryKeys factory migration — COMPLETE ✅

- **42/42 hooks migrated** to the central `queryKeys` factory.
- **0 inline `queryKey: ["..."]` literals** remain in `src/hooks/*.ts`.
- **Regression test** at `src/__tests__/no-inline-query-keys.test.ts` prevents re-introduction.

## #2 — Toast migration — COMPLETE ✅

- **All 18 call sites migrated** (8 hooks + 9 components + 1 page).
- **4 legacy files deleted** (`use-toast.ts`, `ui/toast.tsx`, `ui/toaster.tsx`, `ui/use-toast.ts`).
- **`<Toaster />` mount removed** from `src/App.tsx`.
- **ESLint `no-restricted-imports` rule** bans re-introduction at lint time.
- **3 regression tests** prevent re-creation of deleted files and references.

## #3 — Finance service split — 14/26 done

### Worked examples shipped

| # | Service | LOC before | Tests |
|---|---|---|---|
| 1 | `LedgerTransactionService` | 398 | 20 tests |
| 2 | `CashBankReconcileService` | 293 | 23 tests |
| 3 | `TaxCalculationService` | 84 | 18 tests |
| 4 | `BudgetExecutionService` | 115 | 16 tests |
| 5 | `ApprovalWorkflowService` | 126 | 13 tests |
| 6 | `LedgerInquiryService` | 114 | 22 tests |
| 7 | `ARTransactionService` | 152 | 14 tests |
| 8 | `APTransactionService` | 182 | 15 tests |
| 9 | `FinancialPeriodCloseService` | 89 | 9 tests |
| 10 | `AssetOperationsService` | 107 | 9 tests |
| 11 | `CashBankReportingService` | 127 | 11 tests |
| 12 | `IntegrationOrchestratorService` | 182 | 11 tests |
| 13 | `DayBookService` | 225 | 17 tests |
| 14 | `BankCashTransactionService` | 237 | 14 tests |

**Total: 212 unit tests across 14 finance service modules.** All follow the canonical three-layer pattern:

- `src/lib/finance/<domain>Service.ts` — pure functions, zero React imports
- `src/hooks/finance/use<Domain>View.ts` — state + data fetching, delegates to service
- `src/components/finance/.../<Domain>Service.tsx` — presentation only, zero `useMemo`
- `src/lib/finance/__tests__/<domain>Service.test.ts` — Vitest unit tests

### Remaining 12 services

Per the prioritized list in `docs/FINANCE_SERVICE_SPLIT.md`. Next candidates:
1. `APReportingService.tsx` (262 lines)
2. `ARReportingService.tsx` (266 lines)
3. `JournalManagementService.tsx` (612 lines — largest, most complex)
4. The 11 `setup/*Service.tsx` files (mostly CRUD wrappers)
5. The remaining `reporting/*Service.tsx` and `infrastructure/*Service.tsx` files

At 1 PR per service and ~3 services per week, the long tail is ~4 weeks.

## Repo reorganization — COMPLETE ✅

Restructured into a clean two-folder monorepo layout:

```
Project-Hotel/
├── frontend/          # React + Vite SPA
├── backend/           # Supabase migrations + Docker stack
├── docs/              # shared documentation
├── .env.example       # template for both frontend + backend
├── .gitignore
├── README.md          # explains the two-folder structure
└── vercel.json        # updated build paths (cd frontend && pnpm build)
```

### Files deleted (Lovable-specific)

- `AGENTS.md`, `AGENTS2.md` — Lovable AI agent instructions
- `.jules/` — Lovable internal folder
- `mcp.json` — Lovable MCP config
- `docs/CODE_AUDIT.md`, `docs/ROADMAP.md` — Lovable-generated docs
- `@lovable.dev/cloud-auth-js` dependency — replaced with direct Supabase OAuth
- `lovable-tagger` devDependency — removed from vite.config.ts

## Updated sprint plan

| Sprint | Scope | Status |
|---|---|---|
| **Sprint 1** | Quick wins: README sync, .gitignore, lockfiles, queryKeys factory + 2 refs, toast deprecation markers, migration repair scaffolding, finance split worked example #1 | ✅ Done |
| **Sprint 2a** | Verify worked example compiles + tests pass; batch-migrate 13 more hooks to `queryKeys`; migrate all 8 hooks off `useToast` | ✅ Done |
| **Sprint 2b** | Migrate remaining 27 hooks to `queryKeys` via generic codemod; migrate 9 component files off `useToast` via generic codemod; delete legacy toast files; finance split worked example #2 | ✅ Done |
| **Sprint 3** | Split 3 more finance services; add 3 regression test suites; wire ESLint `no-restricted-imports` rule | ✅ Done |
| **Sprint 4** | Split 3 more finance services (`LedgerInquiryService`, `ARTransactionService`, `APTransactionService`); fix `APTransactionService` missing-toast-import bug | ✅ Done |
| **Sprint 5** | Split 3 more finance services (`FinancialPeriodCloseService`, `AssetOperationsService`, `CashBankReportingService`) | ✅ Done |
| **Sprint 6** (this round) | Split 3 more finance services (`IntegrationOrchestratorService`, `DayBookService`, `BankCashTransactionService`) | ✅ Done |
| **Sprint 7** (next) | Split next 3 finance services (recommend `APReportingService`, `ARReportingService`, `JournalManagementService`) | Pending |
| **Sprint 8+** | Finish finance service split long tail (12 remaining); MCP hardening; down-migrations for stable SQL | Pending |

## Confidence

The build is green, typecheck is clean, **220 unit tests pass** (212 finance-domain + 8 regression), ESLint enforces the toast-import ban, and the Vercel deployment renders correctly. The migration patterns are proven at full scale across all three tracks:

- **queryKeys factory**: 42/42 hooks migrated, regression-tested
- **Toast migration**: 18/18 call sites migrated, 4 files deleted, regression-tested + lint-enforced
- **Finance split**: 14/26 services split with 212 unit tests covering pure business logic
- **Repo reorganization**: clean frontend/ + backend/ folders, Lovable code removed, Vercel deployment working

The remaining work is now demonstrably mechanical and low-risk. The codemods and regression tests are reusable for any future drift.
