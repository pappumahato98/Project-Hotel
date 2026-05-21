# LuxeStay ERP - Architecture Documentation

> **Enterprise-level Property Management System for the Hospitality Industry**

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Module Reference](#module-reference)
7. [Design System](#design-system)
8. [API & Backend](#api--backend)
9. [State Management](#state-management)
10. [Security Architecture](#security-architecture)

---

## Overview

LuxeStay is a self-contained, enterprise-grade ERP system designed specifically for hotels and hospitality businesses. The application handles:

- **Reservation Management** - Booking lifecycle from creation to checkout
- **Guest Management** - VIP tracking, guest profiles, visit history
- **Room Inventory** - Room types, status tracking, pricing
- **Billing & POS** - Invoice generation, payment processing
- **Housekeeping & Engineering** - Maintenance requests, room cleaning schedules
- **Channel Management** - OTA integrations, booking sources
- **Reporting & Analytics** - Occupancy, revenue, operational metrics
- **Staff & HR Management** - Employee records, role assignments

### Key Principles

1. **Self-Contained Architecture** - All business logic resides in project files
2. **Role-Based Access Control** - Granular permissions (user → staff → manager → admin)
3. **Real-time Updates** - Live data synchronization where applicable
4. **Responsive Design** - Mobile-first, works on all devices

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Dev Server |
| **React Router v6** | Client-side Routing |
| **TanStack Query** | Server State Management |
| **Tailwind CSS** | Utility-first Styling |
| **shadcn/ui** | Component Library |
| **Lucide Icons** | Icon System |
| **Recharts** | Data Visualization |

### Backend (Lovable Cloud / Supabase)
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary Database |
| **Row-Level Security** | Data Access Control |
| **Edge Functions (Deno)** | Serverless API Endpoints |
| **Realtime Subscriptions** | Live Data Updates |
| **Auth** | Authentication Provider |

### Libraries
| Library | Purpose |
|---------|---------|
| **React Hook Form** | Form Management |
| **Zod** | Schema Validation |
| **date-fns** | Date Utilities |
| **jsPDF** | PDF Export |
| **xlsx** | Excel Export |
| **Framer Motion** | Animations (via Sonner) |

---

## Project Structure

```
luxestay-erp/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── ROADMAP.md                 # Development roadmap
│   └── LOCAL_SETUP.md             # Local development guide
├── public/                        # Static assets
├── src/
│   ├── components/
│   │   ├── dashboard/             # Dashboard-specific components
│   │   │   ├── MetricCard.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── RecentBookings.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── RoomStatusGrid.tsx
│   │   ├── layout/                # Layout components
│   │   │   ├── GlobalHeader.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── reservations/          # Reservation module components
│   │   │   ├── CheckInOutDialog.tsx
│   │   │   ├── NewReservationDialog.tsx
│   │   │   └── ReservationCalendar.tsx
│   │   └── ui/                    # Reusable UI components (shadcn)
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication state
│   ├── hooks/
│   │   ├── use-mobile.tsx         # Mobile detection
│   │   ├── use-sidebar.tsx        # Sidebar state
│   │   ├── use-toast.ts           # Toast notifications
│   │   ├── useNotifications.ts    # Notification CRUD
│   │   ├── useRealtimeNotifications.ts
│   │   ├── useSettings.ts         # Settings management
│   │   └── useUserRole.ts         # RBAC hooks
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client (auto-generated)
│   │       └── types.ts           # Database types (auto-generated)
│   ├── lib/
│   │   ├── reportExport.ts        # PDF/Excel export utilities
│   │   └── utils.ts               # General utilities
│   ├── pages/                     # Route components
│   │   ├── Auth.tsx
│   │   ├── Billing.tsx
│   │   ├── ChannelManager.tsx
│   │   ├── DevPanel.tsx
│   │   ├── Engineering.tsx
│   │   ├── Guests.tsx
│   │   ├── HR.tsx
│   │   ├── Housekeeping.tsx
│   │   ├── Index.tsx              # Dashboard
│   │   ├── Inventory.tsx
│   │   ├── NotFound.tsx
│   │   ├── POS.tsx
│   │   ├── Profile.tsx
│   │   ├── Reports.tsx
│   │   ├── ReservationCalendar.tsx
│   │   ├── Reservations.tsx
│   │   ├── Rooms.tsx
│   │   ├── Settings.tsx
│   │   ├── StaffManagement.tsx
│   │   └── UserManagement.tsx
│   ├── App.tsx                    # Root component & routing
│   ├── App.css
│   ├── index.css                  # Design tokens & global styles
│   └── main.tsx                   # Entry point
├── supabase/
│   ├── config.toml                # Supabase configuration
│   ├── functions/                 # Edge functions (if any)
│   └── migrations/                # Database migrations
├── tailwind.config.ts             # Tailwind configuration
├── vite.config.ts                 # Vite configuration
└── package.json
```

---

## Database Schema

### Core Tables

#### `profiles`
User profile information linked to auth.users
```sql
id              UUID PRIMARY KEY
user_id         UUID NOT NULL (references auth.users)
first_name      TEXT
last_name       TEXT
email           TEXT
phone           TEXT
avatar_url      TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `user_roles`
Role assignments for RBAC (separate from profiles for security)
```sql
id              UUID PRIMARY KEY
user_id         UUID NOT NULL (references auth.users)
role            app_role NOT NULL DEFAULT 'user'
-- UNIQUE(user_id, role)
```

**Role Hierarchy:** `admin` > `manager` > `staff` > `user`

#### `guests`
Guest records with visit tracking
```sql
id              UUID PRIMARY KEY
first_name      TEXT NOT NULL
last_name       TEXT NOT NULL
email           TEXT
phone           TEXT
id_type         TEXT
id_number       TEXT
address         TEXT
city            TEXT
country         TEXT
is_vip          BOOLEAN DEFAULT false
total_visits    INTEGER DEFAULT 0
total_spending  NUMERIC DEFAULT 0
notes           TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `rooms`
Room inventory and status
```sql
id              UUID PRIMARY KEY
room_number     TEXT NOT NULL
room_type       TEXT NOT NULL
floor           INTEGER NOT NULL
capacity        INTEGER DEFAULT 2
price_per_night NUMERIC NOT NULL
status          TEXT DEFAULT 'available'
description     TEXT
amenities       TEXT[]
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Room Statuses:** `available`, `occupied`, `maintenance`, `cleaning`

#### `reservations`
Booking records linking guests to rooms
```sql
id              UUID PRIMARY KEY
reservation_code TEXT NOT NULL (auto-generated)
guest_id        UUID NOT NULL (references guests)
room_id         UUID NOT NULL (references rooms)
check_in_date   DATE NOT NULL
check_out_date  DATE NOT NULL
actual_check_in TIMESTAMPTZ
actual_check_out TIMESTAMPTZ
adults          INTEGER DEFAULT 1
children        INTEGER DEFAULT 0
total_amount    NUMERIC NOT NULL
amount_paid     NUMERIC DEFAULT 0
payment_status  TEXT DEFAULT 'pending'
status          TEXT DEFAULT 'pending'
source          TEXT DEFAULT 'direct'
special_requests TEXT
created_by      UUID (references auth.users)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Reservation Statuses:** `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`

#### `notifications`
System notifications for users
```sql
id              UUID PRIMARY KEY
user_id         UUID (null = broadcast)
title           TEXT NOT NULL
message         TEXT NOT NULL
type            TEXT NOT NULL
category        TEXT DEFAULT 'info'
is_read         BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
```

#### `settings`
Key-value store for application settings
```sql
id              UUID PRIMARY KEY
key             TEXT NOT NULL UNIQUE
value           JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Setting Keys:**
- `check_in_fields` - Required fields for check-in
- `payment_settings` - Payment configuration
- `booking_sources` - OTA sources
- `rate_plans` - Pricing plans
- `property` - Property details
- `notifications` - Notification preferences

#### `staff_members`
Employee records
```sql
id              UUID PRIMARY KEY
user_id         UUID (references auth.users)
employee_id     TEXT NOT NULL
first_name      TEXT NOT NULL
last_name       TEXT NOT NULL
email           TEXT
phone           TEXT
department      TEXT NOT NULL
position        TEXT NOT NULL
hire_date       DATE DEFAULT CURRENT_DATE
salary          NUMERIC
status          TEXT DEFAULT 'active'
emergency_contact_name TEXT
emergency_contact_phone TEXT
notes           TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `booking_sources`
OTA and booking channel configuration
```sql
id              UUID PRIMARY KEY
code            TEXT NOT NULL
name            TEXT NOT NULL
commission_percentage NUMERIC DEFAULT 0
is_active       BOOLEAN DEFAULT true
is_system       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `rate_plans`
Pricing and discount plans
```sql
id              UUID PRIMARY KEY
code            TEXT NOT NULL
name            TEXT NOT NULL
description     TEXT
discount_percentage NUMERIC DEFAULT 0
min_nights      INTEGER
max_nights      INTEGER
is_active       BOOLEAN DEFAULT true
is_system       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

#### `role_change_audit`
Audit log for role changes
```sql
id              UUID PRIMARY KEY
user_id         UUID NOT NULL
changed_by_user_id UUID NOT NULL
old_role        TEXT NOT NULL
new_role        TEXT NOT NULL
reason          TEXT
created_at      TIMESTAMPTZ
```

### Database Functions

```sql
-- Check if user has specific role
has_role(_user_id UUID, _role app_role) → BOOLEAN

-- Check if user is staff or above
is_staff(_user_id UUID) → BOOLEAN

-- Auto-generate reservation codes
generate_reservation_code() → TRIGGER

-- Create profile on user signup
handle_new_user() → TRIGGER

-- Auto-update updated_at timestamps
update_updated_at_column() → TRIGGER
```

---

## Authentication & Authorization

### Authentication Flow

1. User navigates to `/auth`
2. Signs up or logs in via email/password or Google OAuth
3. On signup, `handle_new_user()` trigger creates:
   - Profile record in `profiles`
   - Default role (`user`) in `user_roles`
4. Session managed by Supabase Auth
5. `AuthContext` provides user/session/profile to app

### Authorization (RBAC)

**Role Hierarchy:**
```
admin (4)     → Full access to all features
  ↓
manager (3)   → Access to staff, reports, settings
  ↓
staff (2)     → Access to operational modules
  ↓
user (1)      → Basic access only
```

**Hook Usage:**
```typescript
// Check if user is admin
const { isAdmin, isLoading } = useIsAdmin();

// Check if user is manager or above
const { isManager } = useIsManager();

// Check if user is staff or above
const { isStaff } = useIsStaff();

// Get highest role
const { data: role } = useUserRole();
```

**Protected Routes:**
```typescript
<Route 
  path="/settings" 
  element={
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  } 
/>
```

---

## Module Reference

### Core Modules

| Module | Route | Description | Access |
|--------|-------|-------------|--------|
| Dashboard | `/` | KPIs, charts, quick actions | All authenticated |
| Reservations | `/reservations` | Booking list, create/edit | Staff+ |
| Calendar | `/calendar` | Visual reservation calendar | Staff+ |
| Guests | `/guests` | Guest directory, VIP management | Staff+ |
| Rooms | `/rooms` | Room inventory, status | Staff+ |
| Billing | `/billing` | Invoices, payments | Staff+ |
| Reports | `/reports` | Analytics, exports | Manager+ |

### Operational Modules

| Module | Route | Description | Access |
|--------|-------|-------------|--------|
| Housekeeping | `/housekeeping` | Cleaning schedules | Staff+ |
| Engineering | `/engineering` | Maintenance requests | Staff+ |
| POS | `/pos` | Point of sale | Staff+ |
| Inventory | `/inventory` | Stock management | Staff+ |
| Channels | `/channels` | OTA connections | Manager+ |

### Admin Modules

| Module | Route | Description | Access |
|--------|-------|-------------|--------|
| User Management | `/users` | User roles, audit log | Admin |
| Staff Management | `/staff` | Employee records | Admin |
| HR | `/hr` | HR functions | Admin |
| Settings | `/settings` | App configuration | Admin |
| Dev Panel | `/dev` | Debug tools, cleanup | Admin |

---

## Design System

### Color Palette (HSL)

```css
/* Dark Navy Theme with Gold Accents */
--background: 222 47% 6%;       /* Deep navy */
--foreground: 45 20% 95%;       /* Off-white text */
--primary: 38 92% 55%;          /* Gold */
--secondary: 222 30% 16%;       /* Lighter navy */
--muted: 222 30% 14%;           /* Muted surfaces */
--accent: 38 70% 45%;           /* Darker gold */
--destructive: 0 72% 51%;       /* Red */
--success: 142 71% 45%;         /* Green */
--warning: 38 92% 50%;          /* Amber */
```

### Typography

```css
--font-display: 'Playfair Display', serif;  /* Headings */
--font-body: 'Inter', sans-serif;           /* Body text */
```

### Gradients

```css
--gradient-gold: linear-gradient(135deg, primary, accent);
--gradient-card: linear-gradient(180deg, card-start, card-end);
--gradient-sidebar: linear-gradient(180deg, sidebar-start, sidebar-end);
```

### Shadows

```css
--shadow-glow: 0 0 30px primary/15%;
--shadow-card: 0 4px 24px background/50%;
--shadow-elevated: 0 8px 32px background/60%;
```

### Component Tokens

All UI components use semantic tokens:
- Use `bg-background`, not `bg-[#0d1117]`
- Use `text-foreground`, not `text-white`
- Use `border-border`, not `border-gray-700`

---

## API & Backend

### Data Access Pattern

All database operations use the Supabase client with RLS:

```typescript
import { supabase } from "@/integrations/supabase/client";

// Fetch with automatic RLS filtering
const { data, error } = await supabase
  .from("reservations")
  .select("*, guest:guests(*), room:rooms(*)")
  .order("created_at", { ascending: false });
```

### React Query Integration

```typescript
// Fetch hook pattern
const { data, isLoading, error } = useQuery({
  queryKey: ["reservations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("reservations").select("*");
    if (error) throw error;
    return data;
  },
});

// Mutation pattern
const mutation = useMutation({
  mutationFn: async (newReservation) => {
    const { data, error } = await supabase
      .from("reservations")
      .insert(newReservation)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
  },
});
```

### Edge Functions (if needed)

Located in `supabase/functions/`:
- Handle external API integrations
- Process webhooks
- Execute sensitive operations

---

## State Management

### Global State

| Context | Purpose |
|---------|---------|
| `AuthContext` | User session, profile, auth methods |
| `SidebarProvider` | Sidebar collapsed/expanded state |

### Server State (TanStack Query)

All data fetching uses React Query with these patterns:
- Query keys: `["table-name"]` or `["table-name", id]`
- Automatic caching and revalidation
- Optimistic updates for better UX

### Local State

- Component-level `useState` for UI state
- Form state via React Hook Form

---

## Security Architecture

### Row-Level Security (RLS)

Every table has RLS enabled with policies:

```sql
-- Example: Staff can manage reservations
CREATE POLICY "Staff can manage reservations"
ON reservations FOR ALL
USING (is_staff(auth.uid()));

-- Example: Users can only see their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);
```

### Security Functions

```sql
-- SECURITY DEFINER prevents recursive RLS
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Security Best Practices

1. **Never store roles in profiles** - Separate `user_roles` table
2. **Never check auth client-side** - All checks via RLS
3. **Use SECURITY DEFINER** - For role-checking functions
4. **Audit sensitive actions** - `role_change_audit` table
5. **Validate on server** - RLS enforces all access rules

### Transport Security & Hardening

1. **TLS Enforcement** - Runtime HTTPS redirect via `enforceHTTPS()` and strict TLS 1.2+ configuration in Caddy.
2. **Security Headers** - Strict HSTS (`preload`), CSP (restricting inline scripts and framing), and anti-sniffing headers injected at the gateway/edge.
3. **Input Sanitization** - `sanitizeHTML()` and `escapeForDisplay()` applied to user inputs as defense-in-depth against XSS.
4. **OAuth Hardening** - PKCE flow enabled for Supabase authentication.
5. **API Gateway Hardening** - Kong rate limiting (5 req/min on auth endpoints) to prevent brute-force attacks.
6. **Continuous Monitoring** - `SSLSecurityDashboard` provides real-time telemetry on TLS status, header compliance, and session integrity.

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

---

## Contributing

1. Follow the established file structure
2. Use TypeScript strictly
3. Follow the design system tokens
4. Add RLS policies for new tables
5. Update this documentation for schema changes

---

*Last Updated: 2026-01-03*
