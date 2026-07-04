# Meridian Hotel — Property Management System

A comprehensive, full-featured **Hotel Property Management System (PMS)** built with modern web technologies. Designed for a 4-star hotel in Kathmandu, Nepal with 48 rooms across 4 floors — fully localized with NPR currency, Bikram Sambat (BS) calendar, and Nepal-specific business rules.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-New%20York-18181b?logo=shadcnui&logoColor=white)

---

## Overview

Meridian Hotel PMS is a single-page application that covers every aspect of hotel operations — from reservations and front desk management to housekeeping, POS, accounting, and revenue management. It features **16 functional modules**, **70+ views**, and **55+ API endpoints** backed by a relational database with **35 data models**.

### Key Highlights

- **16 fully-wired modules** — every view connects to real backend APIs, no mock data
- **Nepal-localized** — NPR currency, BS/AD dual calendar, 13% VAT + 10% service charge, 2PM check-in / 11AM check-out defaults
- **Real-time ready** — Socket.io mini-service with property-level channels
- **Dark mode** — full dark/light theme support via `next-themes`
- **Responsive design** — mobile-first with desktop-enhanced layouts
- **Drag-and-drop room assignment** on the visual room board
- **Multi-property support** — 3 demo properties with property switcher

---

## Modules

| Module | Views | Description |
|--------|-------|-------------|
| **Dashboard** | 1 | KPIs (occupancy, ADR, RevPAR), revenue trends, VIP alerts, room status breakdown, recent activity |
| **Front Desk** | 18 | Reservations CRUD, multi-step check-in wizard, arrivals/departures, in-house guests, folio management, guest ledger, calendar, reports, waitlist, wake-up calls, guest directory, room rate posting, settlement, quick search |
| **Room Management** | 4 | Visual room board with drag-and-drop, room types (bed config, amenities), room restrictions (stop sell, CTA/CTD, min/max LOS) |
| **Operations** | 4 | Night audit, day close, cashier shift management (float, variance), shift handover |
| **Point of Sale** | 9 | Restaurant, Bar & Lounge, Spa, Business Center, Kitchen Display System (KDS), Room Service, Table Reservations, Order History, Daily Sales Report |
| **Housekeeping** | 3 | Task board (table + kanban + attendant views), room inspections, lost & found |
| **Guest CRM** | 3 | Guest profiles with stay history, loyalty program, marketing campaigns |
| **HR & Payroll** | 6 | Staff directory, departments, attendance, payroll processing, work schedules, performance reviews |
| **Events & Banquet** | 2 | Event booking, Banquet Event Orders (BEO) |
| **Accounting** | 3 | General ledger, double-entry journal entries, financial reports |
| **Inventory** | 6 | Stock dashboard, stock levels, vendor management, requisitions, adjustments, purchase orders |
| **Maintenance** | 2 | Work orders (electrical, plumbing, HVAC), asset register with depreciation |
| **Revenue Management** | 3 | Demand calendar, pricing rules, rate intelligence |
| **Channel Manager** | 2 | OTA channel management (Booking.com, Expedia), channel bookings |
| **Help & Support** | 5 | Getting started, keyboard shortcuts, user manual, FAQ, support ticket system |
| **Settings** | 1 | Property config, tax/fees, booking policies, payment methods, business hours, display, locale, notifications, security, backup/restore |

---

## Tech Stack

### Core

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| Language | TypeScript 5 |
| UI Components | shadcn/ui (New York style, 42 components) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Animations | Framer Motion |
| Charts | Recharts |

### Data & State

| Layer | Technology |
|-------|-----------|
| Database | SQLite via Prisma 6 ORM (35 models) |
| Server State | TanStack React Query (30s stale time) |
| Client State | Zustand 5 with localStorage persistence |
| Forms | React Hook Form 7 + Zod 4 |
| Real-time | Socket.io (mini-service on port 3004) |

### UI Libraries

Radix UI primitives, Sonner toasts, Vaul drawers, Embla Carousel, react-day-picker, @dnd-kit drag-and-drop, react-resizable-panels, react-markdown, react-syntax-highlighter, @mdxeditor/editor

### Runtime & Deployment

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Reverse Proxy | Caddy |
| Process Management | Custom watchdog scripts |

---

## Database Schema

The system uses **35 Prisma models** organized across 10 domains:

- **Auth** — AuthUser, ActivityLog
- **Property** — Property
- **Rooms** — RoomType, Room, RoomRestriction
- **Rates** — RatePlan, DailyRate
- **Guests** — Guest
- **Reservations** — Reservation, BookingContact, GuestDocument
- **Folio** — Folio, FolioTransaction, FolioPayment
- **POS** — Outlet, MenuItem, PosOrder, OrderItem
- **Housekeeping** — HkTask, LostFound
- **Events** — Event
- **HR** — Employee, Attendance, Payroll
- **Operations** — NightAudit, CashierShift
- **Inventory** — InventoryItem, Vendor, Requisition
- **Maintenance** — WorkOrder
- **Assets** — Asset
- **Accounting** — LedgerAccount, JournalEntry, JournalEntryLine
- **Channels** — Channel
- **System** — SystemSetting, RoomMoveLog, WaitlistEntry, WakeUpCall

---

## API Endpoints

55+ REST API routes organized by domain:

| Domain | Routes |
|--------|--------|
| Auth | `/api/auth/*` — login, logout, me, profile, password, activity-log |
| Dashboard | `/api/dashboard` |
| Reservations | `/api/reservations`, `/api/reservations/[id]`, `/api/reservations/[id]/check-in` |
| Rooms | `/api/rooms` |
| Calendar | `/api/calendar` |
| Front Desk | `/api/front-desk/*` — dashboard, search, reports |
| Check-In | `/api/check-in` |
| Folio | `/api/folio`, `/api/folio/[id]`, `/api/folio/[id]/split` |
| Guest Ledger | `/api/guest-ledger/*` |
| Room Rate Posting | `/api/room-rate-posting/*`, `/api/room-rate-posts/*` |
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

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- Node.js 18+ (if not using Bun)

### Installation

```bash
# Clone the repository
git clone https://github.com/pappumahato98/Project-Neo.git
cd Project-Neo

# Install dependencies
bun install

# Set up the database
bun run db:push

# Seed demo data (optional)
bun run prisma db seed

# Start development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Environment Variables

No environment variables are required for the default setup. The application uses SQLite (file-based) and runs entirely self-contained.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (ThemeProvider, QueryClient, Fonts)
│   ├── page.tsx                # Main application shell
│   ├── login/page.tsx          # Login page
│   ├── globals.css             # Tailwind CSS + CSS variables
│   └── api/                    # 55+ API route handlers
│       ├── auth/               # Authentication endpoints
│       ├── dashboard/          # Dashboard data
│       ├── reservations/       # Reservation CRUD + check-in
│       ├── rooms/              # Room management
│       ├── folio/              # Folio + split folio
│       ├── housekeeping/       # HK tasks + room status
│       ├── pos/                # Point of sale
│       ├── accounting/         # General ledger + journal entries
│       ├── inventory/          # Stock, vendors, requisitions
│       ├── work-orders/        # Maintenance work orders
│       ├── employees/          # HR, attendance, payroll
│       ├── events/             # Events & banquet
│       ├── channels/           # OTA channel manager
│       └── settings/           # System settings
├── components/
│   ├── modules/                # 16 feature modules (70+ views)
│   │   ├── dashboard/          # Dashboard module
│   │   ├── front-desk/         # Front desk (18 views)
│   │   ├── rooms/              # Room management
│   │   ├── operations/         # Night audit, cashier shifts
│   │   ├── pos/                # Point of sale (9 views)
│   │   ├── housekeeping/       # HK, inspections, lost & found
│   │   ├── crm/                # Guest CRM
│   │   ├── hr/                 # HR & payroll
│   │   ├── events/             # Events & banquet
│   │   ├── accounting/         # Accounting
│   │   ├── inventory/          # Inventory management
│   │   ├── maintenance/        # Work orders & assets
│   │   ├── revenue/            # Revenue management
│   │   ├── channel-manager/    # Channel manager
│   │   ├── help/               # Help & support
│   │   └── settings/           # Settings
│   ├── ui/                     # 42 shadcn/ui components
│   ├── shared/                 # Shared components (settings dialog, badges, etc.)
│   ├── layout/                 # App shell, sidebar, header
│   └── providers/              # QueryClient + realtime providers
├── hooks/                      # Custom React hooks
├── lib/                        # Utilities (format, api, auth, etc.)
└── stores/                     # Zustand state stores
prisma/
├── schema.prisma               # 35 data models
├── seed.ts                     # Demo data seeder (48 rooms, reservations, guests, etc.)
└── seed-auth.ts                # Auth user seeder
mini-services/
└── realtime-service/           # Socket.io real-time service (port 3004)
```

---

## Key Features

### Front Desk Operations
- **Multi-step Check-in Wizard** — 3-step process with ID verification, room selection, and confirmation
- **Folio Management** — Charges, payments, split folio (guest/company/complimentary/master), balance tracking
- **Guest Ledger** — Complete financial history per guest
- **Room Rate Posting** — Daily room charges with bulk posting and pending charge management
- **Settlement** — Batch and individual checkout settlement with multi-folio support
- **Overdue Tracking** — Automatic detection and visual indicators for past-due check-outs

### Room Management
- **Visual Room Board** — Color-coded status board with drag-and-drop room assignment
- **Room Types** — Bed configuration, amenities, occupancy limits per type
- **Restrictions** — Stop sell, closed to arrival/departure, min/max length of stay

### Nepal-Specific
- **Bikram Sambat Calendar** — Full BS/AD conversion, Nepali month names in Devanagari and English
- **NPR Currency** — Formatted throughout with proper symbols and decimal handling
- **Tax Rules** — 13% VAT, 10% service charge, NPR 500 tourism fee
- **Business Rules** — 2PM check-in, 11AM check-out, 11PM night audit, passport requirement for foreigners
- **Cash Transaction Limits** — NPR 200,000 cash limit, NPR 50,000 police report threshold

### Cross-Module Data Coupling
- Room status changes in Housekeeping propagate to Front Desk and Dashboard
- POS room charges (restaurant, business center) update folios and dashboards in real time
- Check-in/check-out events cascade across all dependent views via TanStack Query invalidation

---

## License

This project is for educational and demonstration purposes.