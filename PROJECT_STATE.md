# PROJECT_STATE.md — Meridian Hotel PMS

> **Last Updated:** 2025-06-18 (Session continuation)
> **Latest Commit:** `b883d16` — docs: add PROJECT_STATE.md for cross-session continuity
> **Previous Feature Commit:** `4f9a5ac` — fix(housekeeping): improve board view columns, sticky header, comments, bulk actions
> **Total Source Code:** ~80,779 lines across all `src/` files
> **Module View Code:** ~57,928 lines across 93 module view files
> **API Route Code:** ~9,556 lines across 66 API route files
> **GitHub:** `https://github.com/pappumahato98/Project-Neo` | **Branch:** `main`
> **GitHub Token:** `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`

---

## 1. PROJECT OVERVIEW

**Meridian Hotel** is a full-featured Hotel Property Management System (PMS) built for a **4-star, 48-room hotel in Kathmandu, Nepal**. Features NPR currency, Bikram Sambat calendar, 13% VAT + 10% service charge, and Nepal-specific business rules.

**Single-page application** — all 17 modules render at the `/` route and switch via Zustand navigation state. Only `/login` is a separate route.

---

## 2. TECH STACK (NON-NEGOTIABLE)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router + Turbopack) | 16 | Single-page, `/` route only |
| Language | TypeScript | 5 | Strict typing throughout |
| UI Components | shadcn/ui (New York style) | — | 48 component files |
| Styling | Tailwind CSS | 4 | No inline styles, use `cn()` |
| Database | SQLite via Prisma ORM | 6 | `prisma/schema.prisma` |
| Server State | TanStack React Query | — | 30s stale time, 1 retry |
| Client State | Zustand (localStorage persist) | 5 | 7 stores defined |
| Forms | React Hook Form + Zod | 7 + 4 | Validation schemas |
| Charts | Recharts | — | Dashboard + reports |
| Animations | Framer Motion | — | Page transitions, hovers |
| Icons | Lucide React | — | Only icon library |
| Real-time | Socket.io (mini-service) | — | Port 3004, currently disabled |
| Runtime | Bun | — | `bun run dev` |
| Reverse Proxy | Caddy | — | Caddyfile config |

---

## 3. ARCHITECTURE

```
src/
├── app/
│   ├── page.tsx              # Auth gate → LoginPage or AppShell
│   ├── login/page.tsx        # Standalone login route
│   ├── layout.tsx            # Root: ThemeProvider, QueryClientProvider, fonts
│   ├── globals.css           # Tailwind v4 + CSS vars + neon button glow classes
│   ├── error.tsx             # Error boundary
│   ├── not-found.tsx         # 404 page
│   └── api/                  # 66 API route files (see §5)
├── components/
│   ├── modules/              # 17 feature modules, 93 view files
│   │   ├── dashboard/        # 1 file
│   │   ├── front-desk/       # 23 files (largest module)
│   │   ├── rooms/            # 5 files
│   │   ├── operations/       # 5 files
│   │   ├── pos/              # 11 files (includes pos-types.ts)
│   │   ├── housekeeping/     # 4 files
│   │   ├── crm/              # 4 files
│   │   ├── hr/               # 7 files
│   │   ├── events/           # 3 files
│   │   ├── accounting/       # 4 files
│   │   ├── inventory/        # 7 files
│   │   ├── maintenance/      # 3 files
│   │   ├── revenue/          # 4 files
│   │   ├── channel-manager/  # 3 files
│   │   ├── help/             # 7 files
│   │   ├── settings/         # 1 file
│   │   └── profile/          # 1 file
│   ├── ui/                   # 48 shadcn/ui components
│   ├── shared/               # 8 shared components
│   ├── layout/               # AppShell, SidebarNav, Header (3 files)
│   ├── auth/                 # LoginPage component (1 file)
│   └── providers/            # QueryClient + realtime providers (2 files)
├── hooks/                    # 5 custom hooks
├── lib/                      # 13 utility/library files
prisma/
├── schema.prisma             # 42 data models
├── seed.ts                   # Demo data seeder (~777 lines)
├── seed-auth.ts              # Auth user seeder
└── (migrations)
mini-services/
└── realtime-service/         # Socket.io service (port 3004, disabled)
db/
└── custom.db                 # SQLite database file
```

---

## 4. DATABASE MODELS (42 total in prisma/schema.prisma)

| Category | Models |
|----------|--------|
| **Auth** | AuthUser, ActivityLog |
| **Property** | Property, SystemSetting |
| **Rooms** | RoomType, Room, RoomRestriction |
| **Rates** | RatePlan, DailyRate, RoomRatePosting |
| **Guests** | Guest, BookingContact, GuestDocument |
| **Reservations** | Reservation, WaitlistEntry, RoomMoveLog, WakeUpCall |
| **Folio** | Folio, FolioTransaction, FolioPayment |
| **POS** | Outlet, MenuItem, PosOrder, OrderItem |
| **Housekeeping** | HkTask, LostFound |
| **Events** | Event |
| **HR** | Employee, Attendance, Payroll |
| **Operations** | NightAudit, CashierShift |
| **Inventory** | InventoryItem, Vendor, Requisition |
| **Maintenance** | WorkOrder, Asset |
| **Accounting** | LedgerAccount, JournalEntry, JournalEntryLine |
| **Channels** | Channel |
| **Support** | SupportTicket |

---

## 5. API ROUTES (66 endpoint files)

| Domain | Endpoints |
|--------|-----------|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/profile`, `PUT /api/auth/password`, `GET /api/auth/activity-log` |
| **Dashboard** | `GET /api/dashboard` |
| **Reservations** | `GET/POST /api/reservations`, `GET/PATCH/DELETE /api/reservations/[id]`, `GET/POST /api/reservations/[id]/check-in` |
| **Rooms** | `GET /api/rooms` |
| **Calendar** | `GET /api/calendar` |
| **Front Desk** | `GET /api/front-desk/dashboard`, `GET /api/front-desk/search`, `GET /api/front-desk/reports` |
| **Check-In** | `POST /api/check-in` |
| **Folio** | `GET/POST /api/folio`, `GET/PATCH/DELETE /api/folio/[id]`, `POST /api/folio/[id]/split` |
| **Guest Ledger** | `GET /api/guest-ledger`, `GET /api/guest-ledger/[id]` |
| **Room Rate Posting** | `GET/POST /api/room-rate-posting`, `GET/PATCH/DELETE /api/room-rate-posting/[id]`, `GET /api/room-rate-posting/list`, `GET /api/room-rate-posting/pending`, `POST /api/room-rate-posting/bulk-post`, `GET /api/room-rate-posts`, `GET /api/room-rate-posts/pending` |
| **Room Moves** | `POST /api/room-moves` |
| **Housekeeping** | `GET/POST /api/housekeeping`, `GET /api/housekeeping/rooms` |
| **POS** | `GET/POST /api/pos` |
| **Events** | `GET/POST /api/events`, `GET/PATCH/DELETE /api/events/[id]`, `GET/POST /api/banquet-orders` |
| **Operations** | `GET/POST /api/operations` |
| **Revenue** | `GET /api/revenue` |
| **HR** | `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/[id]`, `GET/POST /api/attendance`, `GET /api/payroll` |
| **Accounting** | `GET/POST /api/accounting`, `GET/PATCH/DELETE /api/accounting/[id]` |
| **Inventory** | `GET/POST /api/inventory`, `GET/PATCH/DELETE /api/inventory/[id]`, `GET/POST /api/requisitions`, `GET/POST /api/vendors` |
| **Maintenance** | `GET/POST /api/work-orders`, `GET/PATCH/DELETE /api/work-orders/[id]`, `GET/POST /api/assets` |
| **Channels** | `GET/POST /api/channels`, `GET/PATCH/DELETE /api/channels/[id]`, `GET /api/channel-bookings` |
| **Support** | `GET/POST /api/support-tickets`, `GET/PATCH/DELETE /api/support-tickets/[id]` |
| **Settings** | `GET/PUT /api/settings`, `POST /api/settings/reset` |
| **Waitlist** | `GET/POST /api/waitlist`, `GET/PATCH/DELETE /api/waitlist/[id]` |
| **Wake-Up Calls** | `GET/POST /api/wake-up-calls`, `GET/PATCH/DELETE /api/wake-up-calls/[id]` |
| **Guests** | `GET/POST /api/guests`, `GET/PATCH/DELETE /api/guests/[id]` |
| **Guest Documents** | `GET/POST /api/guest-documents`, `GET/PATCH/DELETE /api/guest-documents/[id]` |
| **Root** | `GET /api/route` (catch-all) |

---

## 6. MODULES (17 modules, 93 view files)

| # | Module | Folder | Views | Key Features | API Data? |
|---|--------|--------|-------|-------------|-----------|
| 1 | **Dashboard** | `dashboard/` | 1: DashboardModule | KPIs, room status grid, VIP alerts, revenue chart, activity feed, quick actions | ✅ |
| 2 | **Front Desk** | `front-desk/` | 23 files, 18+ views: FrontDeskDashboard, NewReservationPage, ReservationsView, CheckInPage (Lookup/Process/Wizard), CheckInLookup, ArrivalsView, InHouseView, DeparturesView (overdue badge), FolioView (split folio), GuestLedgerView, CalendarView, ReservationCalendarView, ReportsView, WaitlistView, WakeUpCallsView, GuestDirectoryView, RoomRatePostingPage/Dialog, SettlementView (multi-folio), QuickSearch | Most complex module. Check-in wizard (3 steps), dual-column layout, stay calendar, receipt printing, CSV export, bulk select, hamburger menus | ✅ (all 18+ views) |
| 3 | **Rooms** | `rooms/` | 4: RoomBoard, RoomTypesView, RestrictionsView, RoomDetailDrawer | Drag-drop room board, room type management, floor plans, restriction rules | ✅ |
| 4 | **Operations** | `operations/` | 4: NightAuditView, DayCloseView, CashierView, ShiftHandoverView | Night audit workflow, day-end close, cashier shift management, shift handover notes | ✅ |
| 5 | **POS** | `pos/` | 11: RestaurantView, BarView, SpaView, BusinessCenterView, KitchenDisplayView, RoomServiceView, TableReservationsView, OrderHistoryView, DailySalesReportView + pos-types.ts + PosModule | 6 outlets (Restaurant, Bar, Spa, Business Center, Room Service, Kitchen Display), order management, post-charge-to-room, daily sales reports | ✅ |
| 6 | **Housekeeping** | `housekeeping/` | 3: TaskBoardView (3 modes: table/kanban/attendant), InspectionView, LostFoundView | Table view with sticky header, 7 filter types, bulk actions (7 buttons), 3-dot action menu, row selection. Kanban columns. Attendant grouping. Cross-invalidates room status on task completion. | ✅ |
| 7 | **CRM** | `crm/` | 3: GuestProfilesView, LoyaltyView, CampaignsView | Guest profiles with stay history, loyalty points, marketing campaigns | ✅ |
| 8 | **HR** | `hr/` | 6: EmployeesView, DepartmentsView, AttendanceView, PayrollView, SchedulesView, PerformanceView | Staff management, department tree, attendance tracking, payroll processing, shift scheduling, KPIs | ✅ |
| 9 | **Events** | `events/` | 2: EventsView, BanquetOrdersView | Event management, BEO (Banquet Event Orders) | ✅ |
| 10 | **Accounting** | `accounting/` | 3: LedgerView, JournalView, FinancialReportsView | General ledger, double-entry journal, P&L/balance sheet reports | ✅ |
| 11 | **Inventory** | `inventory/` | 6: InventoryDashboardView, StockView, VendorsView, RequisitionsView, StockAdjustmentsView, PurchaseOrdersView | Stock levels, vendor management, requisition workflow, stock adjustments, PO tracking | ✅ |
| 12 | **Maintenance** | `maintenance/` | 2: WorkOrdersView, AssetRegisterView | Work order lifecycle, asset register with maintenance schedules | ✅ |
| 13 | **Revenue** | `revenue/` | 3: DemandCalendarView, PricingView, RateIntelligenceView | Demand forecasting, dynamic pricing rules, rate intelligence/competitor analysis | ✅ |
| 14 | **Channel Manager** | `channel-manager/` | 2: ChannelsView, BookingsView | OTA channel management (Booking.com, Agoda, etc.), booking synchronization | ✅ |
| 15 | **Help** | `help/` | 6: GettingStartedView, KeyboardShortcutsView, UserManualView, FaqView, ContactSupportView, HelpSupportPage | Onboarding, shortcuts reference, user manual, FAQ, contact form | Static content |
| 16 | **Settings** | `settings/` | 1: SettingsModule (via SettingsDialog) | 1100+ line dialog: Property, Tax, Policies, Payments, Display, Locale, Security, Backup, Notifications, Integrations, Email/Print, Room defaults | ✅ |
| 17 | **Profile** | `profile/` | 1: ProfileModule | User avatar upload, personal info editing, password change | ✅ |

**All data views use real backend API data via `useQuery` + `apiFetch()`. Zero mock/hardcoded data.**

---

## 7. KEY ARCHITECTURE PATTERNS

### 7.1 Navigation System
- **Single-page app**: All modules render at `/` route via `src/app/page.tsx`
- **Auth gate**: `page.tsx` checks `useAuthStore.isAuthenticated` → shows `LoginPage` or `AppShell`
- **Module router**: `AppShell` reads `useNavigationStore.activeModule` → renders corresponding `*Module.tsx`
- **Sidebar-tab linking**: Bidirectional sync between sidebar items and in-module `<Tabs>` via `navigateTo(moduleId, subModuleId)`
- **`navigateTo`**: Sets `activeModule`, `activeSubModule`, and auto-expands sidebar parent

### 7.2 Data Fetching
- **API helper**: `src/lib/api.ts` → `apiFetch(path, options)` wrapper around native `fetch`
- **Query keys**: `src/lib/queryKeys.ts` → centralized `qk` factory object
- **Pattern**: Every view uses `useQuery({ queryKey: qk.xxx(), queryFn: () => apiFetch('/api/xxx') })`
- **Stale time**: 30 seconds, 1 retry on error

### 7.3 Cross-Module Cache Invalidation (7 helpers in queryKeys.ts)
| Helper | When to Call | What It Invalidates |
|--------|-------------|-------------------|
| `invalidate.afterCheckIn(qc)` | After guest check-in | rooms, roomsBoard, roomsTypes, roomsAll, roomsCalendar, roomsVacant, vacantRooms, reservations, arrivals, inHouse, departures, dashboard, frontDeskDashboard, guests |
| `invalidate.afterCheckout(qc)` | After guest check-out | Same as check-in + folios |
| `invalidate.afterReservationChange(qc)` | After CRUD on reservation | rooms (all variants), reservations, arrivals, departures, inHouse, dashboards, guests |
| `invalidate.afterFolioChange(qc, guestId?)` | After charge/payment/void | folios, inHouse, departures, dashboards, guestLedger (if guestId), guestFolios (if guestId) |
| `invalidate.afterRoomTransfer(qc)` | After room transfer | rooms (all), reservations, inHouse, dashboards, roomMoves |
| `invalidate.afterAudit(qc)` | After night audit/day close | rooms (all), reservations, folios, inHouse, arrivals, departures, dashboards, operations, guests |
| `invalidate.afterRoomStatusChange(qc)` | After HK status change | rooms (all), dashboards, housekeeping |
| `invalidate.afterFolioCharge(qc)` | After POS charge to room | folios, inHouse, departures, dashboards |

### 7.4 State Management (7 Zustand stores in src/lib/store.ts)
| Store | Persist? | Purpose |
|-------|----------|---------|
| `useAuthStore` | ✅ localStorage `meridian-auth` | User auth state, token, login/logout/updateUser |
| `usePropertyStore` | ✅ localStorage `meridian-property` | Active property + property list (3 hotels) |
| `usePreferencesStore` | ✅ localStorage `meridian-preferences` | User preferences (language, currency, timezone, Nepali standards) |
| `useSettingsStore` | ✅ localStorage `meridian-settings` | System settings (tax, policies, payments, business hours, etc.) with backend sync |
| `useNavigationStore` | ❌ | Active module, sub-module, expanded sidebar items, search open |
| `useFrontDeskContextStore` | ❌ | Check-in session, prefill reservation ID, new reservation flag |
| `useFolioContextStore` | ❌ | Folio context (reservationId, guestName, roomNumber) passed from InHouse → Folio |
| `useGuestLedgerContextStore` | ❌ | Guest ledger context passed from any module → Guest Ledger |
| `useReservationContextStore` | ❌ | Reservation context for cross-module navigation |
| `useFrontDeskTabsStore` | ✅ localStorage `meridian-fd-tabs` | Disabled/enabled Front Desk sub-tabs |

### 7.5 Sidebar Navigation (NAV_ITEMS in src/lib/navigation.ts)
17 top-level items. Items with `children[]` are expandable in sidebar. Each child links to a sub-module tab within the parent module. `EXTRA_SUB_MODULE_LABELS` maps internal sub-module IDs that aren't in the sidebar (e.g., `check-in-process`, `guest-ledger`, `rate-posting`, `settlement`).

---

## 8. NEPAL-SPECIFIC FEATURES

- **Bikram Sambat Calendar**: Full BS ↔ AD conversion (years 2070–2090) in `src/lib/nepali-calendar.ts`
- **Dual Calendar Component**: `DualCalendar` in shared/ shows both AD and BS dates
- **NPR Currency**: Formatted throughout with `formatNPR()` in `src/lib/format.ts`
- **Tax Rules**: 13% VAT, 10% service charge, NPR 500 tourism fee
- **Business Rules**: 2PM check-in / 11AM check-out, 11PM night audit
- **RoomTypeBedBadge**: Format `"TYPE #BedName +pax"` (e.g., `"DLX #King +2"`)
- **Nepali Standards Config**: Dual calendar, holiday alerts, auto tax rules, foreign guest registration, tourism fee

---

## 9. SHARED COMPONENTS (8 in src/components/shared/)

| Component | File | Purpose |
|-----------|------|---------|
| `SettingsDialog` | `SettingsDialog.tsx` | 1100+ line comprehensive settings modal (10 sections) |
| `RoomTypeBedBadge` | `room-type-bed-badge.tsx` | Room type + bed config badge with pax count |
| `DualCalendar` | `dual-calendar.tsx` | AD + BS side-by-side calendar date picker |
| `StatusBadge` | `status-badge.tsx` | Colored status badges with variants |
| `StepIndicator` | `step-indicator.tsx` | Multi-step wizard progress indicator |
| `KeyboardShortcutsDialog` | `keyboard-shortcuts-dialog.tsx` | Keyboard shortcut reference modal |
| `HelpSupportDialog` | `help-support-dialog.tsx` | In-app help dialog |
| `Illustrations` | `illustrations.tsx` | SVG illustrations for empty states |

---

## 10. HOUSEKEEPING BOARD VIEW — DETAILED STATE

**File:** `src/components/modules/housekeeping/TaskBoardView.tsx` (~1045 lines)

### View Modes
- **Board (Table)** — DEFAULT: Full table with filters, selection, bulk actions
- **Kanban**: 5 columns (Pending, In Progress, Cleaned, Inspected, Failed)
- **Attendant**: Cards grouped by attendant name

### Table View Columns
1. ⋮ Action Menu (DropdownMenu: View Details, Start Cleaning, Mark Cleaned, Mark Inspected, Reset to Pending, Set Rush Priority)
2. ☐ Checkbox (row selection)
3. Room (room number + floor)
4. Room Type (RoomTypeBedBadge)
5. HK Status (colored badge)
6. Priority (colored dot + label)
7. Floor
8. Reservation (colored status badge: occupied/vacant/due_in/confirmed)
9. Comments (shows `taskNotes` only, not guest special requests)

### Table View Features
- **7 Filters**: Search (debounced), Room (text popover), Room Type (dropdown), HK Status (dropdown), Priority (dropdown), Floor (dropdown), Reservation (dropdown)
- **Sticky Header**: `bg-card` solid background, `sticky top-0 z-10`
- **Row Selection**: Checkbox per row, select-all in header checkbox
- **Bulk Action Bar** (appears when 2+ rows selected): Start Cleaning, Mark Cleaned, Mark Inspected, Set Rush, Reset to Pending (ArrowUpCircle), Mark Failed (XCircle, red), Deselect All
- **Alternating row backgrounds** for readability

### APIs
- Table data: `GET /api/housekeeping/rooms?hkStatus=&priority=&floor=&search=`
- Kanban data: `GET /api/housekeeping`
- Status changes: `POST /api/housekeeping { id, action: 'update-task-status', status }`

---

## 11. FRONT DESK MODULE — DETAILED STATE (LARGEST MODULE)

**23 component files, 18+ sub-views**

### Sub-Views (tab order)
1. **Dashboard** — Today's KPIs, arrivals/departures/occupancy summary
2. **New Reservation** — Full reservation creation form
3. **Reservations** — Table with search, filter, detail dialog
4. **Check-In** — Tab bar with: Find Reservation (dual-column layout), Direct Walk-in
5. **Arrivals** — Today's expected arrivals list
6. **In-House Guests** — Current guests with folio quick-view
7. **Departures** — Today's departures + overdue (red OVERDUE badge), receipt printing, late checkout surcharge
8. **Guest Folio** — Transaction list, add charge, record payment, void, split folio dialog
9. **Calendar** — Monthly/weekly calendar with room color coding
10. **Reports** — Arrivals/departures/in-house summary tables
11. **Settlement** — Outstanding balances, individual + batch settlement, multi-folio support
12. **Guest Ledger** — Historical guest financial records
13. **Room Rate Posting** — Daily rate posting with bulk post capability
14. **Waitlist** — Waitlist management
15. **Wake-Up Calls** — Scheduled wake-up calls
16. **Guest Directory** — In-house guest directory (was mock, now API)
17. **Quick Search** — Global search across rooms/reservations/guests

### Notable Features
- **Check-In Wizard**: 3-step process (Guest Info → Stay Details → Room Assignment)
- **Dual-Column Layout**: Left = search/arrivals list, Right = reservation detail card with stay calendar
- **Stay Calendar**: Mini calendar showing check-in (green), stay (teal), check-out (red) days
- **Split Folio**: Dialog to move transactions to Company/Complimentary/Master folio
- **Receipt Printing**: `window.open()` with formatted HTML receipt
- **Overdue Departures**: Red badge, red row highlighting, fetched alongside today's departures
- **Neon Button Glow**: CSS classes `btn-neon`, `btn-neon-red`, `btn-neon-green`, `btn-neon-amber`
- **Hamburger Menus**: DropdownMenu with Refresh Data, Export CSV, Print List, Toggle Compact View
- **Checkbox Selection**: Select-all, floating action bar on Departures and Settlement

---

## 12. DEMO DATA

- **Property**: Meridian Hotel, Kathmandu, 4-star, 48 rooms, 4 floors
- **Room Types**: Standard (STD), Deluxe (DLX), Deluxe Pool View (DPV), Premium Suite (PSU), Presidential Suite (PRS)
- **Reservations**: 38 total (18 checked-in, 20 confirmed), dates around July 1, 2026
- **Employees**: Demo staff records with departments
- **POS**: 6 outlets with menu items (Restaurant, Bar, Spa, Business Center, Room Service, Pool Bar)
- **Auth**: Default login `admin@meridian.com` / `admin123` (see seed-auth.ts)

---

## 13. DEPLOYMENT & PROCESS MANAGEMENT

- **Dev**: `bun run dev` → port 3000 (Next.js Turbopack)
- **Gateway**: Caddy reverse proxy (Caddyfile) — single port exposure, `XTransformPort` query param for mini-services
- **Process Scripts**: `auto-restart.sh`, `keepalive.sh`, `watchdog.sh`, `start.sh`, `serve.mjs`
- **Mini-service**: `mini-services/realtime-service/` (Socket.io on port 3004, currently disabled)
- **WebSocket Rule**: Always use `io("/?XTransformPort=3004")` — never absolute URLs with ports
- **API Rule**: Always relative paths, use `XTransformPort` query param for cross-service requests

---

## 14. IMPORTANT FILE INDEX

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/page.tsx` | 36 | Auth gate + module router |
| `src/lib/store.ts` | 603 | All 7+ Zustand stores |
| `src/lib/navigation.ts` | 241 | NAV_ITEMS + EXTRA_SUB_MODULE_LABELS |
| `src/lib/queryKeys.ts` | 196 | Query key factory + 8 invalidation helpers |
| `src/lib/api.ts` | — | `apiFetch()` wrapper |
| `src/lib/db.ts` | — | Prisma client singleton |
| `src/lib/format.ts` | — | formatNPR(), getBedTypeName(), toDateOnly() |
| `src/lib/nepali-calendar.ts` | — | BS ↔ AD conversion |
| `src/lib/nepali-rules.ts` | — | Nepal-specific business rules |
| `src/lib/room-conflict.ts` | — | Room availability conflict checker |
| `src/lib/broadcast.ts` | — | Real-time broadcast helper |
| `src/lib/sort-csv.ts` | — | CSV export sorting |
| `src/lib/fetch-retry.ts` | — | Retry logic for fetch |
| `src/lib/utils.ts` | — | `cn()` utility |
| `src/components/layout/sidebar-nav.tsx` | — | Full sidebar with collapsible nav, property switcher, user profile |
| `src/components/layout/app-shell.tsx` | — | Main layout shell with sidebar + content area |
| `src/components/layout/header.tsx` | — | Top header with search, notifications, profile |
| `prisma/schema.prisma` | ~900 | 42 data models |
| `prisma/seed.ts` | ~777 | Demo data seeder |
| `src/app/globals.css` | — | Tailwind v4 config + CSS variables + neon glow classes |
| `README.md` | — | Comprehensive project documentation |

---

## 15. CODING CONVENTIONS & RULES

1. **Single Route**: Only `/` is user-visible. No other routes. `page.tsx` is the module router.
2. **API Routes**: Always route handlers in `src/app/api/`. Client calls via `apiFetch()`. Never use server actions.
3. **Components**: shadcn/ui first. Custom in `shared/`. Module views in `modules/`.
4. **State**: Zustand for client state, TanStack Query for server state. Never mix.
5. **Styling**: Tailwind CSS classes only. No inline styles. Use `cn()` for conditional classes.
6. **Icons**: Lucide React only. No other icon libraries.
7. **No indigo/blue** unless explicitly requested.
8. **Responsive**: Mobile-first, `sm:`, `md:`, `lg:` breakpoints.
9. **Sticky Footer**: `min-h-screen flex flex-col` + `mt-auto` on footer.
10. **Dark Mode**: Supported via `next-themes` with `class` strategy.
11. **Lint**: Must pass `bun run lint` with 0 errors, 0 warnings.
12. **No `bun run build`** — only `bun run dev`.
13. **Port**: Next.js always on 3000. No other ports for main app.
14. **Gateway**: Caddy handles port routing. Mini-services use `XTransformPort` query param.
15. **SDK Usage**: `z-ai-web-dev-sdk` MUST only be used in backend API routes, never client-side.
16. **Diffs Only**: When modifying existing files, use targeted edits, never full rewrites.
17. **WORKLOG**: Every agent must read/append to `worklog.md` using the Task ID format.

---

## 16. RECENT WORKLOG SUMMARY (from worklog.md)

### Task 5a: RoomTypeBedBadge to All Front-Desk Views
- Added to InHouseView (5 locations), DeparturesView (6), CheckInView (4), ReportsView (3), ReservationCalendarView (1)
- Format: "DLX #King +2" (type shortcut + hash + bed name + pax in red)

### Task 5b: Settlement Page
- Created SettlementView.tsx with outstanding balances, payment processing
- 18 guests with NPR 692,292 total outstanding
- Multi-folio support: folio selector when >1 folio exists

### Task 5c: bedConfig API Fix
- Added `bedConfig: true` to room type select in 6 API route files (10 locations)
- API now returns real bed config data

### Task 6b-6c: Mock Data Audit + Fix
- Audited 18 front-desk views: 17/18 already used API, GuestDirectoryView had mock data
- Fixed GuestDirectoryView: replaced 12 hardcoded guests with API query

### fix-functions: Fix All Non-Functional Features
- Fixed DB dates to current period (July 2026)
- Fixed SettlementView API calls (404 → 200)
- Fixed DeparturesView payment mutation field names
- Fixed DeparturesView late checkout surcharge (wrong endpoint)
- Added overdue departures with red OVERDUE badge
- Fixed null room crash in departures
- Implemented real receipt printing via `window.open()`
- Added neon button glow CSS classes
- Added hamburger menus + checkboxes to Departures/Settlement

### Task 7: Split Folio Feature
- Created `POST /api/folio/[id]/split` API
- FolioView: Full split dialog with transaction selection, type picker, amount preview
- SettlementView: Multi-folio aggregation and settlement
- Fixed scope bug (Split Folio button in child component couldn't access parent state)

### Task 6: Check-In Page Dual-Column Layout
- Removed `max-w-2xl` constraint
- Find Reservation mode: Left (48%) search + results, Right (52%) detail card
- Added mini Stay Calendar to both Find Reservation and Direct Walk-in modes

### Task 13: Cross-Module Cache Invalidation
- Added 3 qk entries: housekeeping, pos, channelBookings
- Added 2 invalidation helpers: afterRoomStatusChange, afterFolioCharge
- InspectionView: Approve/Reject now invalidates rooms/dashboards/HK
- Restaurant PostToRoomDialog: Posts real folio charges + invalidates
- BusinessCenter EndRentalDialog: Posts real folio charges + invalidates
- Added `charge_to_room` action to POS API route

### Task 7 (HK Board Rewrite)
- Created `GET /api/housekeeping/rooms` API endpoint
- Rewrote TaskBoardView.tsx with 3 view modes (Board/Kanban/Attendant)
- Board view: 7 filter types, checkbox selection, bulk actions, colored badges

### Housekeeping Board View Fixes (commit 4f9a5ac)
- Sticky header: Changed to solid `bg-card` background
- Column reorder: Added empty header before checkbox, moved RowActionMenu before checkbox in rows
- Comments: Shows only `taskNotes`, not guest special requests
- Bulk actions: Added "Reset to Pending" (ArrowUpCircle) and "Mark Failed" (XCircle, red) buttons
- Room filter: Text search popover
- Reservation filter: Dropdown filter
- Removed summary chart

---

## 17. KNOWN ISSUES / AREAS FOR IMPROVEMENT

1. **Real-time service disabled**: Socket.io mini-service on port 3004 exists but is not started/enabled
2. **No print for all views**: Receipt printing only in Departures; other views lack print support
3. **Some views may lack full CRUD**: Many views have table display + create dialog but may not have full edit/delete flows
4. **No role-based access control**: Auth system exists but UI doesn't enforce role-based visibility
5. **No multi-language**: i18n not implemented (only English)
6. **Calendar view**: Complex but may have edge cases with month boundaries
7. **No automated tests**: Zero test files (by design per project rules)
8. **Tool-results cleanup**: `tool-results/` directory has many cached file reads that could be cleaned
9. **Upload directory**: `upload/` directory has many screenshot files from browser verification
10. **Root-level screenshots**: Many `.png` files in project root from browser verification sessions

---

## 18. GIT & GITHUB

- **Repository**: `pappumahato98/Project-Neo`
- **Branch**: `main`
- **Latest Token**: `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`
- **Push Command**: `git add -A && git commit -m "message" && git push https://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@github.com/pappumahato98/Project-Neo.git main`
- **Note**: Previous token `ghp_xX5n...` was revoked (exposed in chat). Always use the latest token above.
- **Commit Style**: Conventional commits (feat:, fix:, docs:, etc.)

---

## 19. QUICK START FOR NEW SESSION

```bash
cd /home/z/my-project

# 1. Read this file first
cat PROJECT_STATE.md

# 2. Read worklog for latest changes
cat worklog.md

# 3. Start dev server (if not running)
bun run dev &

# 4. Check for lint errors
bun run lint

# 5. Verify in browser via agent-browser
# Navigate to / and test the feature
```

---

## 20. SESSION HANDOFF CHECKLIST

Before ending a session, ensure:
- [ ] All changes committed and pushed to GitHub
- [ ] `worklog.md` updated with Task ID, agent, work log, stage summary
- [ ] `PROJECT_STATE.md` updated with any new modules, APIs, or architecture changes
- [ ] `bun run lint` passes with 0 errors
- [ ] Browser verification completed for any UI changes
- [ ] No console errors in dev.log