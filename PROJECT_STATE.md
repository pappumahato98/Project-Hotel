# PROJECT_STATE.md — Meridian Hotel PMS

> **Last Updated:** 2026-07-01
> **Latest Commit:** `4f9a5ac` — fix(housekeeping): improve board view columns, sticky header, comments, bulk actions
> **Total Module Code:** ~58,000 lines across 87 view files

---

## 1. PROJECT OVERVIEW

**Meridian Hotel** is a full-featured Hotel Property Management System (PMS) built for a 4-star hotel in Kathmandu, Nepal (48 rooms, 4 floors, NPR currency, Bikram Sambat calendar).

**GitHub:** `https://github.com/pappumahato98/Project-Neo`
**Branch:** `main`

---

## 2. TECH STACK (NON-NEGOTIABLE)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router + Turbopack) | 16 |
| Language | TypeScript | 5 |
| UI Components | shadcn/ui (New York style) | — |
| Styling | Tailwind CSS | 4 |
| Database | SQLite via Prisma ORM | 6 |
| Server State | TanStack React Query | — |
| Client State | Zustand (with localStorage persist) | 5 |
| Forms | React Hook Form + Zod | 7 + 4 |
| Charts | Recharts | — |
| Animations | Framer Motion | — |
| Icons | Lucide React | — |
| Real-time | Socket.io (mini-service, port 3004) | — |
| Runtime | Bun | — |
| Reverse Proxy | Caddy | — |

---

## 3. ARCHITECTURE

```
src/
├── app/
│   ├── page.tsx              # Main app shell (single-page, module router)
│   ├── login/page.tsx        # Login page
│   ├── globals.css           # Tailwind + CSS variables + neon button classes
│   ├── layout.tsx            # Root layout (ThemeProvider, QueryClient, Fonts)
│   └── api/                  # 60 API route files (see §5)
├── components/
│   ├── modules/              # 16 feature modules (87 view files)
│   ├── ui/                   # 42 shadcn/ui components
│   ├── shared/               # 8 shared components (SettingsDialog, RoomTypeBedBadge, DualCalendar, etc.)
│   ├── layout/               # AppShell, SidebarNav, Header
│   ├── auth/                 # Login page component
│   └── providers/            # QueryClient + realtime providers
├── hooks/                    # 5 custom hooks (useMobile, useEnterSubmit, useKeyboardShortcuts, useRealtime, useToast)
├── lib/                      # Utilities (api.ts, db.ts, format.ts, navigation.ts, queryKeys.ts, utils.ts, store.ts, etc.)
└── stores/                   # Zustand state stores
prisma/
├── schema.prisma             # 42 data models
├── seed.ts                   # Demo data seeder
└── seed-auth.ts              # Auth user seeder
mini-services/
└── realtime-service/         # Socket.io real-time service (port 3004, currently disabled)
```

---

## 4. DATABASE MODELS (42 total, in prisma/schema.prisma)

**Auth:** AuthUser, ActivityLog
**Property:** Property
**Rooms:** RoomType, Room, RoomRestriction
**Rates:** RatePlan, DailyRate
**Guests:** Guest, BookingContact, GuestDocument
**Reservations:** Reservation
**Folio:** Folio, FolioTransaction, FolioPayment
**POS:** Outlet, MenuItem, PosOrder, OrderItem
**Housekeeping:** HkTask, LostFound
**Events:** Event
**HR:** Employee, Attendance, Payroll
**Operations:** NightAudit, CashierShift
**Inventory:** InventoryItem, Vendor, Requisition
**Maintenance:** WorkOrder, Asset
**Accounting:** LedgerAccount, JournalEntry, JournalEntryLine
**Channels:** Channel
**System:** SystemSetting, RoomMoveLog, WaitlistEntry, WakeUpCall, SupportTicket, RoomRatePosting

---

## 5. API ROUTES (60 endpoints)

| Domain | Routes |
|--------|--------|
| Auth | `/api/auth/login`, `/logout`, `/me`, `/profile`, `/password`, `/activity-log` |
| Dashboard | `/api/dashboard` |
| Reservations | `/api/reservations`, `/api/reservations/[id]`, `/api/reservations/[id]/check-in` |
| Rooms | `/api/rooms` |
| Calendar | `/api/calendar` |
| Front Desk | `/api/front-desk/dashboard`, `/front-desk/search`, `/front-desk/reports` |
| Check-In | `/api/check-in` |
| Folio | `/api/folio`, `/api/folio/[id]`, `/api/folio/[id]/split` |
| Guest Ledger | `/api/guest-ledger`, `/api/guest-ledger/[id]` |
| Room Rate Posting | `/api/room-rate-posting/*`, `/api/room-rate-posts/*` (6 routes) |
| Room Moves | `/api/room-moves` |
| Housekeeping | `/api/housekeeping`, `/api/housekeeping/rooms` |
| POS | `/api/pos` |
| Events | `/api/events/*` |
| Operations | `/api/operations` |
| Revenue | `/api/revenue` |
| HR | `/api/employees/*`, `/api/attendance/*`, `/api/payroll/*` |
| Accounting | `/api/accounting/*` |
| Inventory | `/api/inventory/*`, `/api/requisitions/*`, `/api/vendors/*` |
| Maintenance | `/api/work-orders/*`, `/api/assets/*` |
| Channels | `/api/channels/*`, `/api/channel-bookings` |
| Support | `/api/support-tickets/*` |
| Settings | `/api/settings`, `/api/settings/reset` |
| Waitlist | `/api/waitlist/*` |
| Wake-Up Calls | `/api/wake-up-calls/*` |
| Guests | `/api/guests/*` |
| Guest Documents | `/api/guest-documents/*` |

---

## 6. MODULES (16 modules, 87 view files)

| # | Module | File(s) | Sub-Views | API Data? |
|---|--------|---------|-----------|-----------|
| 1 | Dashboard | `DashboardModule.tsx` | KPIs, room status, VIP alerts, revenue chart, activity feed | ✅ |
| 2 | Front Desk | `FrontDeskModule.tsx` | 18 views: Dashboard, New Reservation, Reservations, Check-In (Lookup/Process/Wizard/Page), Arrivals, In-House, Departures, Folio, Guest Ledger, Calendar, Reports, Waitlist, Wake-Up Calls, Guest Directory, Rate Posting, Settlement, Quick Search | ✅ (all 18) |
| 3 | Rooms | `RoomManagementModule.tsx` | Room Board (drag-drop), Room Types, Restrictions, Room Detail Drawer | ✅ |
| 4 | Operations | `OperationsModule.tsx` | Night Audit, Day Close, Cashier Shifts, Shift Handover | ✅ |
| 5 | POS | `PosModule.tsx` | 9 views: Restaurant, Bar & Lounge, Spa, Business Center, Kitchen Display, Room Service, Table Reservations, Order History, Daily Sales | ✅ |
| 6 | Housekeeping | `HousekeepingModule.tsx` | Task Board (3 modes: table/kanban/attendant), Inspections, Lost & Found | ✅ |
| 7 | CRM | `CrmModule.tsx` | Guest Profiles, Loyalty Program, Campaigns | ✅ |
| 8 | HR | `HrModule.tsx` | Staff Directory, Departments, Attendance, Payroll, Schedules, Performance | ✅ |
| 9 | Events | `EventsModule.tsx` | Events, Banquet Orders (BEO) | ✅ |
| 10 | Accounting | `AccountingModule.tsx` | General Ledger, Journal Entries, Financial Reports | ✅ |
| 11 | Inventory | `InventoryModule.tsx` | Stock Dashboard, Stock Levels, Vendors, Requisitions, Adjustments, Purchase Orders | ✅ |
| 12 | Maintenance | `MaintenanceModule.tsx` | Work Orders, Asset Register | ✅ |
| 13 | Revenue | `RevenueModule.tsx` | Demand Calendar, Pricing Rules, Rate Intelligence | ✅ |
| 14 | Channel Manager | `ChannelManagerModule.tsx` | Channels, Bookings | ✅ |
| 15 | Help | `HelpModule.tsx` | Getting Started, Shortcuts, User Manual, FAQ, Contact Support | ✅ |
| 16 | Settings | `SettingsModule.tsx` | Comprehensive dialog (property, tax, policies, payments, display, locale, security, backup) | ✅ |
| 17 | Profile | `ProfileModule.tsx` | User profile, avatar, personal info, password | ✅ |

**All views use real backend API data. Zero mock/hardcoded data.**

---

## 7. KEY ARCHITECTURE PATTERNS

### Navigation
- **Single-page app**: All modules render at `/` route, switched by Zustand `useNavigationStore`
- **Store fields**: `activeModule`, `activeSubModule`, `expandedItems`
- **Sidebar**: `sidebar-nav.tsx` — collapsible sidebar with sub-items, reads from `navigation.ts` (NAV_ITEMS)
- **Module tabs**: Each module with sub-views uses `<Tabs>` component synced to `activeSubModule` via `navigateTo(moduleId, subModuleId)`

### Data Fetching
- **API helper**: `src/lib/api.ts` → `apiFetch(path, options)` wrapper around `fetch`
- **Query keys**: `src/lib/queryKeys.ts` — centralized `qk` object + invalidation helpers (`afterRoomStatusChange`, `afterFolioCharge`)
- **All views**: `useQuery` + `apiFetch` pattern, 30s stale time, 1 retry

### State Management
- **Zustand stores** (src/lib/store.ts): `useNavigationStore`, `useAuthStore`, `usePropertyStore`, `useFolioContextStore`, `useCheckInSessionStore`
- **All use localStorage persistence** via Zustand `persist` middleware

### Sidebar-Tab Linking
- Sidebar sub-items call `navigateTo(moduleId, childId)` → updates store → module tabs react
- Module tabs call `navigateTo(moduleId, tabValue)` → updates store → sidebar highlights
- `navigateTo` also ensures module is in `expandedItems` for sidebar expansion

---

## 8. NEPAL-SPECIFIC FEATURES

- **Bikram Sambat Calendar**: Full BS ↔ AD conversion (years 2070–2090), dual-calendar component
- **NPR Currency**: Formatted throughout with `formatNPR()` in `lib/format.ts`
- **Tax Rules**: 13% VAT, 10% service charge, NPR 500 tourism fee
- **Business Rules**: 2PM check-in / 11AM check-out, 11PM night audit
- **RoomTypeBedBadge**: Format "TYPE #BedName +pax" (e.g., "DLX #King +2")

---

## 9. CROSS-MODULE DATA COUPLING

- **afterRoomStatusChange**: Invalidates rooms, roomsBoard, roomsTypes, roomsAll, roomsCalendar, roomsVacant, vacantRooms, frontDeskDashboard, dashboard, housekeeping
- **afterFolioCharge**: Invalidates folios, inHouse, departures, dashboard, frontDeskDashboard
- Housekeeping task completion → propagates to Front Desk/Dashboard
- POS room charges (restaurant, business center) → propagate to folio/dashboard/in-house views

---

## 10. SHARED COMPONENTS

| Component | Location | Purpose |
|-----------|----------|---------|
| `SettingsDialog` | `shared/SettingsDialog.tsx` | 1100+ line comprehensive settings modal |
| `RoomTypeBedBadge` | `shared/room-type-bed-badge.tsx` | Room type + bed config badge |
| `DualCalendar` | `shared/dual-calendar.tsx` | AD + BS calendar date picker |
| `StatusBadge` | `shared/status-badge.tsx` | Colored status badges |
| `StepIndicator` | `shared/step-indicator.tsx` | Multi-step wizard progress |
| `KeyboardShortcutsDialog` | `shared/keyboard-shortcuts-dialog.tsx` | Keyboard shortcut reference |
| `HelpSupportDialog` | `shared/help-support-dialog.tsx` | In-app help dialog |
| `Illustrations` | `shared/illustrations.tsx` | SVG illustrations for empty states |

---

## 11. HOUSEKEEPING BOARD VIEW — CURRENT STATE

**File:** `src/components/modules/housekeeping/TaskBoardView.tsx` (~1045 lines)

### View Modes
- **Board (Table)**: Default. Columns: ⋮ Action Menu | ☐ Checkbox | Room | Room Type | HK Status | Priority | Floor | Reservation | Comments
- **Kanban**: 5 columns (Pending, In Progress, Cleaned, Inspected, Failed)
- **Attendant**: Cards grouped by attendant name

### Table View Features
- **Filters**: Search (debounced), Room (text popover), Room Type (dropdown), HK Status (dropdown), Priority (dropdown), Floor (dropdown), Reservation (dropdown)
- **Sticky Header**: `bg-card` solid background, `sticky top-0 z-10`
- **Row Selection**: Checkbox per row, select-all in header
- **Bulk Action Bar** (2+ selected): Start Cleaning, Mark Cleaned, Mark Inspected, Set Rush, Reset to Pending, Mark Failed, Deselect All
- **Comments Column**: Only shows `taskNotes` (HK comments), not guest special requests
- **Action Menu** (⋮ per row): View Details, Start Cleaning, Mark Cleaned, Mark Inspected, Reset to Pending, Set Rush Priority

### API
- Table data: `GET /api/housekeeping/rooms?hkStatus=&priority=&floor=&search=`
- Kanban data: `GET /api/housekeeping`
- Status changes: `POST /api/housekeeping { id, status }`

---

## 12. DEMO DATA

- **Property**: Meridian Hotel, Kathmandu, 4-star, 48 rooms, 4 floors
- **Room Types**: Standard (STD), Deluxe (DLX), Deluxe Pool View (DPV), Premium Suite (PSU), Presidential Suite (PRS)
- **Reservations**: 38 total (18 checked-in, 20 confirmed), dates around July 1, 2026
- **Employees**: Demo staff records
- **POS**: 6 outlets with menu items

---

## 13. DEPLOYMENT

- **Dev**: `bun run dev` → port 3000
- **Gateway**: Caddy reverse proxy (Caddyfile)
- **Process Scripts**: `auto-restart.sh`, `keepalive.sh`, `watchdog.sh`
- **Mini-service**: `mini-services/realtime-service/` (Socket.io on port 3004, currently disabled)

---

## 14. IMPORTANT FILE INDEX

| File | Purpose |
|------|---------|
| `src/lib/store.ts` | All Zustand stores (navigation, auth, property, folio context, check-in session) |
| `src/lib/navigation.ts` | NAV_ITEMS array + EXTRA_SUB_MODULE_LABELS + getSubModuleLabel() |
| `src/lib/queryKeys.ts` | Centralized query key factory + invalidation helpers |
| `src/lib/api.ts` | `apiFetch()` helper for all API calls |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/format.ts` | formatNPR(), getBedTypeName(), toDateOnly(), etc. |
| `src/components/layout/sidebar-nav.tsx` | Full sidebar with collapsible nav groups, property switcher, user profile |
| `src/components/layout/app-shell.tsx` | Main layout shell with sidebar + content area |
| `src/app/page.tsx` | Module router — renders active module based on navigation store |
| `prisma/schema.prisma` | 42 data models |
| `prisma/seed.ts` | Demo data seeder (777 lines) |
| `globals.css` | Tailwind config + CSS variables + neon button glow classes |
| `README.md` | Comprehensive project documentation |

---

## 15. CODING CONVENTIONS

1. **API Routes**: Always use `'use server'` / route handlers in `src/app/api/`. Client calls via `apiFetch()`.
2. **Components**: shadcn/ui first. Custom components in `shared/`. Module views in `modules/`.
3. **State**: Zustand for client state, TanStack Query for server state. Never mix.
4. **Styling**: Tailwind CSS classes only. No inline styles. Use `cn()` for conditional classes.
5. **Icons**: Lucide React only.
6. **No indigo/blue** unless explicitly requested.
7. **Responsive**: Mobile-first, `sm:`, `md:`, `lg:` breakpoints.
8. **Sticky Footer**: `min-h-screen flex flex-col` + `mt-auto` on footer.
9. **Dark Mode**: Supported via `next-themes` with `class` strategy.
10. **Lint**: Must pass `bun run lint` with 0 errors.