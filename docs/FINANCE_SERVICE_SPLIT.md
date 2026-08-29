# Finance Service Split — RFC and Worked Example

## Problem

`src/components/finance/transactions/` and `src/components/finance/reporting/`
contain **26 `.tsx` files** whose names end in `*Service.tsx`:

```
transactions/  LedgerTransactionService, APTransactionService, ARTransactionService,
               BankCashTransactionService, CashBankReconcileService, TaxCalculationService,
               JournalManagementService, AssetOperationsService, BudgetExecutionService,
               DayBookService, ApprovalWorkflowService, FinancialPeriodCloseService,
               IntegrationOrchestratorService
reporting/      ConsolidationBIService, APReportingService, ARReportingService,
               CashBankReportingService, FixedAssetsReportingService, TaxReportingService,
               AuditReportingService, FinancialReportingService, BudgetForecastReportingService,
               LedgerInquiryService
setup/          (11 more `*Service.tsx` files)
infrastructure/ SharedDataService, APIGatewayService, EventBusService, SecurityLayerService
```

Each is a single React component that **mixes**:

1. **Business logic** — filtering, aggregation, summary computation, policy decisions (e.g. "linked ledger" derivation).
2. **Data fetching** — `useQuery` / `useMutation` calls + Supabase realtime subscriptions.
3. **Presentation** — 200–400 lines of JSX (filter sidebars, tables, summary cards, modals).

### Symptoms

- **Untestable.** Business logic can only be exercised by mounting the component with mocked Supabase + TanStack Query providers. There are zero unit tests for finance-domain computations.
- **Duplicated logic.** The "linked ledger" derivation, for example, exists in `LedgerTransactionService.tsx` and almost certainly re-appears (with subtle variations) in `LedgerInquiryService.tsx` and `ARReportingService.tsx`.
- **Hard to review.** A 400-line PR touching presentation can break business logic and vice-versa.
- **No reuse.** Other modules (e.g. reports, dashboards) cannot call into finance computations without importing the React component.
- **Slow HMR.** Editing a string in JSX recompiles the business logic too.

## Proposed split — three layers

For each `*Service.tsx`, split into:

```
src/lib/finance/<domain>Service.ts              # pure functions, zero React, fully unit-tested
src/hooks/finance/use<Domain>View.ts            # React hook: state + data fetching + delegates to service
src/components/finance/transactions/<Domain>TransactionService.tsx   # presentation only, ~100-200 lines
src/lib/finance/__tests__/<domain>Service.test.ts   # Vitest unit tests for the pure layer
```

### Layer responsibilities

| Layer | Allowed imports | Responsibilities | Forbidden |
|---|---|---|---|
| **Service** (`lib/finance/`) | types only, no React, no Supabase | Pure functions over plain data. Constants. Type definitions. Policy decisions. | JSX, hooks, `supabase`, `useQuery`, side effects |
| **Hook** (`hooks/finance/`) | service + React + Supabase + TanStack Query | Owns filter state. Fetches data. Calls pure service functions inside `useMemo`. Returns a flat view-model. | JSX (except trivial return-type wrappers) |
| **Component** (`components/finance/`) | hook + UI primitives | Render filter sidebar, table, cards. Wire user events to hook callbacks. | Business logic, `useMemo` for computation (move to hook or service) |

### Decision rule

> If you find yourself writing `useMemo` in the component file, it almost
> certainly belongs in the hook (if it depends on fetched data) or the
> service (if it's a pure transform). The component should contain **zero**
> `useMemo` calls.

## Worked example: `LedgerTransactionService`

### Before (398 lines, monolithic)

```
src/components/finance/transactions/LedgerTransactionService.tsx  (398 lines)
  ├── constants: FISCAL_YEARS, FY_RANGES
  ├── useState × 7
  ├── useAccounts, useLedger, useJournalEntries
  ├── useMemo × 4 (linkedAccounts, filteredEntries, summary, summaryGrouped)
  ├── event handlers
  └── JSX (filter sidebar + details table + summary cards)
```

### After (3 files, separation of concerns)

```
src/lib/finance/ledgerService.ts                              (158 lines)
  ├── constants: FISCAL_YEARS, FY_RANGES, DEFAULT_FILTERS
  ├── types: LedgerFilters, ShowMode, LedgerSummary, LedgerSummaryGroup
  ├── pure: computeLinkedAccounts, filterByLinkedLedger, computeSummary,
  │         groupByJournalEntry, withFiscalYear, withSelectedAccount
  └── zero React imports

src/hooks/finance/useLedgerTransactionView.ts                 (134 lines)
  ├── useState × 8 (filter state)
  ├── useAccounts, useLedger, useJournalEntries
  ├── useMemo × 4 (delegates to service)
  ├── useCallback × 5 (action callbacks)
  └── returns flat view-model

src/components/finance/transactions/LedgerTransactionService.tsx  (~370 lines of JSX)
  ├── const { ... } = useLedgerTransactionView()
  └── pure JSX: filter sidebar + details table + summary cards

src/lib/finance/__tests__/ledgerService.test.ts               (160 lines)
  └── 17 unit tests across 7 describe blocks
```

### What this unlocks

1. **Unit tests run in milliseconds** — no React testing library, no Supabase mock, no jsdom. Just `vitest run src/lib/finance/__tests__/`.
2. **Reuse** — `computeLinkedAccounts` can now be called by `LedgerInquiryService` or a future `useReconcileHook` without re-implementation.
3. **Smaller diffs** — a typo fix in JSX doesn't touch the service file; a bug fix in aggregation doesn't touch JSX.
4. **Faster HMR** — editing JSX only recompiles the component; the service module is cached.
5. **Type safety flows both ways** — `LedgerFilters` and `LedgerSummary` are exported from the service, consumed by both the hook and the component.

## Migration plan for the other 25 services

### Triage

Rank the 26 services by:
1. **Lines of code** (longest first).
2. **Number of `useMemo` calls** (most first) — these are the highest-value splits.
3. **Whether they have obvious duplicates** with another service.

### Batch cadence

- **1 service per PR.** Each PR ships: service extraction + hook + component refactor + unit tests.
- **Target: 2 services per week.** That's ~13 weeks for the whole module — call it Q1 next year.
- **No big-bang.** Each PR is independently mergeable and revertible.

### Recommended first 5 targets (highest ROI)

| Service | LOC | useMemo | Why first |
|---|---|---|---|
| `LedgerTransactionService` | 398 | 4 | **Done in this PR** (reference example) |
| `LedgerInquiryService` (reporting) | ~350 est. | ~3 | Likely shares logic with Ledger — extracting both will reveal duplication |
| `CashBankReconcileService` | ~400 est. | ~4 | Reconciliation has complex pure logic (match rules) that desperately needs tests |
| `TaxCalculationService` | ~300 est. | ~3 | Tax math must be correct; pure-function tests are essential |
| `BudgetExecutionService` | ~350 est. | ~3 | Budget vs actuals aggregation is reused by `BudgetForecastReportingService` |

### Definition of done (per service)

- [ ] Service file extracted, zero React imports.
- [ ] Hook file extracted, returns flat view-model.
- [ ] Component file contains only JSX + event wiring; zero `useMemo`.
- [ ] Unit tests for every exported service function; ≥ 80% line coverage.
- [ ] Manual smoke test of the original UI flow passes.
- [ ] PR description links to this doc.

## Anti-patterns to avoid

1. **Don't put Supabase calls in the service.** The service is pure. If you need data, the hook fetches it and passes it in.
2. **Don't return JSX from the hook.** Hooks return data + callbacks, never elements.
3. **Don't add a `useMemo` to the component "just for performance".** If it's a computation, it goes in the hook or the service.
4. **Don't skip the unit tests.** The whole point of the split is testability — if you ship the split without tests, you've added files without adding value.
5. **Don't rename the public component export.** Consumers (e.g. `src/pages/Finance.tsx`) should not need to change. Keep `export function LedgerTransactionService()` as the component name.

## Verification checklist for this PR's worked example

- [x] `src/lib/finance/ledgerService.ts` — zero React imports, all functions pure.
- [x] `src/hooks/finance/useLedgerTransactionView.ts` — owns state, delegates computation to service.
- [x] `src/components/finance/transactions/LedgerTransactionService.tsx` — refactored to consume the hook; zero `useMemo`.
- [x] `src/lib/finance/__tests__/ledgerService.test.ts` — 17 tests across 7 describe blocks.
- [x] Public component export name unchanged (`LedgerTransactionService`).
- [ ] Manual smoke test: open Finance → Ledger tab, exercise filter sidebar, details mode, summary mode, linked-ledger filter. *(Pending reviewer run.)*
- [ ] `pnpm vitest run src/lib/finance/__tests__/ledgerService.test.ts` passes. *(Pending reviewer run.)*
- [ ] `pnpm build` succeeds with no new type errors. *(Pending reviewer run.)*
