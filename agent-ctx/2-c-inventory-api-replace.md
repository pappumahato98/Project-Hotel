# Task 2-c: Replace Hardcoded Mock Data in Inventory Views with API Data

## Changes Made

### 1. `/api/inventory/route.ts` — Added 3 section handlers to GET

- **`section=purchase-orders`**: Generates realistic PO records by joining Vendor + InventoryItem data. Each active vendor gets 1-3 POs with items from inventory matching their supplier field. Returns `{ purchaseOrders, vendors }`.
- **`section=activity`**: Generates 7 recent activity entries from the most recently updated InventoryItems. Maps activity types (received, write-off, transfer, correction) to items. Returns `{ activity }`.
- **`section=expiring`**: Filters InventoryItems for perishable categories (F&B) or name matches (milk, chicken, etc.), generates 6 expiring entries with dates 2-7 days in the future. Returns `{ expiring }`.

### 2. `PurchaseOrdersView.tsx` — Replaced all mock data

- **Removed**: `MOCK_PURCHASE_ORDERS` (10 hardcoded POs, ~115 lines), `fetchInventory` helper, `mockVendorNames` array merge logic
- **Added**: `fetchPurchaseOrders()` → `/api/inventory?section=purchase-orders`
- **Architecture change**: Replaced `useState(MOCK_DATA)` + `useEffect` with proper React patterns:
  - `apiPOs` derived via `useMemo` from query data
  - `statusOverrides` state for local status changes (applied on top of API data)
  - `locallyCreatedPOs` state for new POs created in the dialog
  - `purchaseOrders` = `useMemo` combining local creations + API POs with overrides
- **Added**: Loading skeleton state, error display with AlertCircle
- **Vendor dropdown**: Now uses vendor list from PO API response (no mock names)
- **Cleaned imports**: Removed `useEffect`, `useQueryClient` (unused)

### 3. `InventoryDashboardView.tsx` — Replaced 2 hardcoded arrays

- **Removed**: `RECENT_ACTIVITY` (7 entries), `EXPIRING_ITEMS` (6 entries)
- **Added**: `fetchActivity()` → `/api/inventory?section=activity`, `fetchExpiring()` → `/api/inventory?section=expiring`
- **Added**: `ACTIVITY_TYPE_META` map to resolve `type` string from API → icon/color (ArrowDown, AlertTriangle, ArrowRight, ArrowUpDown)
- **Added**: Loading skeletons for both activity feed and expiring items sections
- **Added**: Empty state messages ("No recent activity.", "No items expiring soon.")
- **Cleaned imports**: Removed `Separator`, `PackageCheck`, `CheckCircle2` (unused)

## Lint Results

- 0 new errors introduced. The 1 pre-existing error in `ArrivalsView.tsx` is unrelated.
- All hooks are called before conditional returns (rules-of-hooks satisfied).
- No `setState` inside `useEffect` (set-state-in-effect satisfied).