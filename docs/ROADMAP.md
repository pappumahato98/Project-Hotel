# LuxeStay ERP - Technical Roadmap

> Development status, planned features, and implementation priorities

---

## Module Status Overview

### ✅ Completed Modules

| Module | Status | Features |
|--------|--------|----------|
| **Authentication** | ✅ Complete | Email/password, Google OAuth, auto-confirm, session management |
| **Dashboard** | ✅ Complete | KPIs, revenue chart, room status grid, quick actions, recent bookings |
| **Reservations** | ✅ Complete | CRUD, status workflow, calendar view, drag-drop, walk-in check-in |
| **Guests** | ✅ Complete | Directory, VIP tagging, search, visit/spending tracking |
| **Rooms** | ✅ Complete | Inventory management, status tracking, floor/type organization |
| **User Management** | ✅ Complete | Role assignment, audit log with filters, multi-role detection |
| **Settings** | ✅ Complete | Check-in fields, payments, booking sources, rate plans, property, notifications |
| **Reports** | ✅ Complete | Occupancy, revenue breakdown, PDF/Excel export |
| **Dev Panel** | ✅ Complete | Role cleanup tool, audit visibility, debug utilities |

### 🚧 In Progress Modules

| Module | Status | Remaining Work |
|--------|--------|----------------|
| **Billing** | 🚧 70% | Invoice generation UI, payment recording, receipt printing |
| **Housekeeping** | 🚧 60% | Task assignment, room cleaning status, housekeeping schedule |
| **Engineering** | 🚧 60% | Maintenance request form, status workflow, priority levels |
| **Staff Management** | 🚧 75% | Full CRUD, link to user accounts, department filtering |

### 📋 Planned Modules

| Module | Status | Description |
|--------|--------|-------------|
| **POS** | 📋 Planned | Product catalog, order management, payment processing |
| **Inventory** | 📋 Planned | Stock tracking, low stock alerts, purchase orders |
| **Channel Manager** | 📋 Planned | OTA integrations, rate parity, availability sync |
| **HR** | 📋 Planned | Leave management, scheduling, performance tracking |

---

## Phase 1: Core Operations (Current)

### Sprint 1.1 - Billing Module ✅ → 🚧

**Objective:** Complete invoice and payment management

**Tasks:**
- [ ] Invoice generation from reservations
- [ ] Line item management (room charges, extras, taxes)
- [ ] Payment recording (cash, card, bank transfer)
- [ ] Invoice PDF export
- [ ] Payment history per guest
- [ ] Outstanding balance reports

**Database Changes:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  reservation_id UUID REFERENCES reservations,
  guest_id UUID REFERENCES guests,
  invoice_number TEXT UNIQUE,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  status TEXT DEFAULT 'draft',
  due_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices,
  description TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  total NUMERIC
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices,
  amount NUMERIC,
  payment_method TEXT,
  reference_number TEXT,
  received_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ
);
```

### Sprint 1.2 - Housekeeping Module

**Objective:** Room cleaning management and scheduling

**Tasks:**
- [ ] Housekeeping task list view
- [ ] Room cleaning status (dirty, in-progress, clean, inspected)
- [ ] Task assignment to staff
- [ ] Priority levels (normal, urgent, deep-clean)
- [ ] Cleaning checklist templates
- [ ] Supervisor inspection workflow
- [ ] Room turnover time tracking

**Database Changes:**
```sql
CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms,
  assigned_to UUID REFERENCES staff_members,
  task_type TEXT, -- 'checkout_clean', 'stayover', 'deep_clean'
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  inspected_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE cleaning_checklists (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES housekeeping_tasks,
  item TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);
```

### Sprint 1.3 - Engineering Module

**Objective:** Maintenance request and work order management

**Tasks:**
- [ ] Maintenance request form (guests/staff can submit)
- [ ] Work order creation and assignment
- [ ] Priority and category classification
- [ ] Status workflow (open → assigned → in-progress → completed)
- [ ] Parts/inventory tracking per work order
- [ ] Preventive maintenance scheduling
- [ ] Vendor management for external repairs

**Database Changes:**
```sql
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms,
  reported_by UUID,
  category TEXT, -- 'plumbing', 'electrical', 'hvac', 'furniture', 'other'
  priority TEXT DEFAULT 'normal',
  description TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ
);

CREATE TABLE work_orders (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES maintenance_requests,
  assigned_to UUID REFERENCES staff_members,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  parts_used JSONB,
  cost NUMERIC,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);
```

---

## Phase 2: Revenue Operations

### Sprint 2.1 - POS Module

**Objective:** Point of sale for restaurants, bars, spa, etc.

**Features:**
- Product/service catalog management
- Quick-sale interface with categories
- Order management (dine-in, room service, takeaway)
- Bill splitting and discounts
- Post to room folio option
- Shift management and cash drawer
- Daily sales reports

### Sprint 2.2 - Inventory Module

**Objective:** Stock and supply chain management

**Features:**
- Item catalog with categories
- Stock levels with min/max thresholds
- Purchase order creation
- Goods receiving workflow
- Stock adjustments and transfers
- Vendor management
- Low stock alerts
- Inventory valuation reports

### Sprint 2.3 - Channel Manager

**Objective:** OTA and distribution management

**Features:**
- Connect booking sources (Booking.com, Expedia, etc.)
- Real-time availability sync
- Rate management across channels
- Reservation import from OTAs
- Commission tracking per source
- Overbooking prevention
- Performance analytics per channel

---

## Phase 3: People Operations

### Sprint 3.1 - HR Module

**Objective:** Human resources management

**Features:**
- Employee onboarding workflow
- Document management (contracts, IDs)
- Leave management (request, approve, track)
- Shift scheduling
- Attendance tracking
- Performance reviews
- Training records
- Payroll preparation data

### Sprint 3.2 - Enhanced Staff Management

**Objective:** Complete workforce management

**Features:**
- Department hierarchy
- Skill/certification tracking
- Shift swap requests
- Overtime management
- Staff availability calendar
- Team communication tools

---

## Phase 4: Guest Experience

### Sprint 4.1 - Guest Portal

**Objective:** Self-service for guests

**Features:**
- Booking lookup by confirmation code
- Pre-arrival preferences form
- Digital check-in/checkout
- Room service ordering
- Maintenance request submission
- Invoice viewing and payment

### Sprint 4.2 - CRM & Marketing

**Objective:** Guest relationship management

**Features:**
- Guest segmentation
- Email campaign integration
- Loyalty points tracking
- Special occasion reminders (birthdays, anniversaries)
- Review management integration
- Guest feedback surveys

---

## Phase 5: Intelligence & Automation

### Sprint 5.1 - Advanced Analytics

**Objective:** Business intelligence dashboard

**Features:**
- RevPAR, ADR, occupancy trends
- Competitive set benchmarking
- Forecasting models
- Custom report builder
- Scheduled report delivery
- Export to BI tools

### Sprint 5.2 - Automation & Workflows

**Objective:** Reduce manual tasks

**Features:**
- Automated email confirmations
- Dynamic pricing rules
- Automatic room assignment
- Housekeeping auto-scheduling
- Low inventory auto-reorder
- Alert escalation workflows

---

## Technical Debt & Improvements

### Code Quality
- [ ] Add comprehensive unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Implement error boundary components
- [ ] Add loading skeletons for all data fetches
- [ ] Improve TypeScript strict mode compliance

### Performance
- [ ] Implement virtual scrolling for large lists
- [ ] Add image optimization pipeline
- [ ] Implement service worker for offline support
- [ ] Add request debouncing/throttling
- [ ] Database query optimization

### Security
- [ ] Add rate limiting to sensitive endpoints
- [ ] Implement session timeout warnings
- [ ] Add two-factor authentication option
- [ ] Security audit and penetration testing
- [ ] GDPR compliance features

### DevOps
- [ ] CI/CD pipeline documentation
- [ ] Database backup automation
- [ ] Monitoring and alerting setup
- [ ] Performance benchmarking
- [ ] Disaster recovery procedures

---

## File Organization Guidelines

### Component Size Limits
- Keep page components under 500 lines
- Extract reusable logic into hooks
- Split large forms into sub-components
- Create shared components in `/components/ui`

### Naming Conventions
```
pages/ModuleName.tsx           # Page component
components/module/Feature.tsx  # Module-specific component
hooks/useModuleName.ts         # Data fetching hook
lib/moduleUtils.ts             # Utility functions
```

### New Module Checklist
1. [ ] Create page component in `/pages`
2. [ ] Add route in `App.tsx`
3. [ ] Add sidebar navigation item
4. [ ] Create database migration (if needed)
5. [ ] Add RLS policies
6. [ ] Create data hooks
7. [ ] Update this roadmap
8. [ ] Update ARCHITECTURE.md

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12 | Initial release - Core PMS |
| 1.1.0 | 2026-01 | User management, RBAC, audit logging |
| 1.2.0 | TBD | Billing module completion |
| 1.3.0 | TBD | Housekeeping & Engineering |
| 2.0.0 | TBD | POS, Inventory, Channel Manager |

---

*Last Updated: 2026-01-03*
