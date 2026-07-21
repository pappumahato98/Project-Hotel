# Meridian PMS — Full Verification Report

**Date:** July 15, 2026  
**Scope:** 66 API routes, 40 DB models, 16+ frontend modules  
**Tested by:** Automated verification (API testing, DB audit, code review, stub inventory)

---

## Executive Summary

The Meridian Hotel PMS is a **large, feature-rich application** with a solid security foundation. The core modules (Dashboard, Front Desk, Reservations, Housekeeping, Settings, Auth) are **fully functional**. Several secondary modules (POS, Accounting, HR, Revenue, etc.) have **complete UIs but rely on mock data or placeholder handlers** for advanced features.

| Category | Total | Pass | Fail | Notes |
|----------|-------|------|------|-------|
| API Auth (401 unauthenticated) | 37 | 37 | 0 | All routes properly protected |
| API Authenticated GET | 40 | 34 | 6 | 4 are by-design (need query params), 2 are real 500 bugs |
| RBAC (GM vs Admin) | 3 | 3 | 0 | GM correctly blocked from settings/reset |
| Rate Limiting | 1 | 1 | 0 | 429 after 3 failed logins |
| DB Schema (Prisma) | 1 | 1 | 0 | Validates clean, 46 tables |
| Referential Integrity | 6 | 6 | 0 | Zero orphaned records |
| Data Quality | 4 | 4 | 0 | Clean seed data |
| Print Functions | 9 | 3 real | 5 placeholder, 1 dead | |
| Export Functions | 10 | 5 real | 5 placeholder | |
| Email Functions | 4 | 1 real | 3 placeholder | |
| Other Stubs | 9 | 0 | 8 placeholder, 1 mock | |

---

## Critical Issues (Must Fix)

### 1. `/api/room-rate-posts/pending` — 500 Server Error
- **File:** `src/app/api/room-rate-posts/pending/route.ts:39`
- **Bug:** Uses `db.roomRatePost` but the Prisma model is `RoomRatePosting`
- **Fix:** Change `db.roomRatePost` → `db.roomRatePosting`

### 2. `/api/work-orders` GET — 500 Server Error
- **File:** `src/app/api/work-orders/route.ts`
- **Bug:** Likely `priority` field ordering issue or missing DB column
- **Fix:** Investigate `orderBy: [{ priority: 'desc' }]` — verify WorkOrder model has a sortable `priority` field

---

## High Priority Issues

### 3. POS DailySalesReportView — 100% Mock Data
- **File:** `src/components/modules/pos/DailySalesReportView.tsx`
- **Issue:** Entire report uses hardcoded `MOCK_REPORT` data, not API
- **Impact:** Sales reports show fake numbers in production

### 4. Folio Email — Never Calls API
- **File:** `src/components/modules/front-desk/FolioView.tsx:621`
- **Issue:** `handleConfirmEmailFolio()` shows fake success toast but never calls `/api/folio/[id]/email`
- **Impact:** Email folio feature appears to work but does nothing

### 5. Folio Email API — Nodemailer Commented Out
- **File:** `src/app/api/folio/[id]/email/route.ts`
- **Issue:** Full email logic exists but Nodemailer integration is commented out, only `console.log()`
- **Impact:** Even if frontend called the API, no email would be sent

### 6. Departures Email Receipt — Pure Stub
- **File:** `src/components/modules/front-desk/DeparturesView.tsx:490`
- **Issue:** `handleEmailReceipt()` has comment "In production, this would call an email API"
- **Impact:** Email receipt feature is non-functional

### 7. 8 Missing Database Indexes
- **Tables:** Reservation (roomId, guestId), FolioTransaction (folioId), FolioPayment (folioId), OrderItem (orderId), JournalEntryLine (entryId), HkTask (roomId), HkInspectionAudit (hkTaskId)
- **Impact:** Query performance degradation as data grows

---

## Medium Priority Issues

### 8. 4 Routes Return 400 Without Query Params (By Design)
- `/api/guest-ledger` — requires `guestId`
- `/api/guest-documents` — requires `guestId`
- `/api/room-rate-posting` — requires `reservationId`
- `/api/room-rate-posts` — requires `reservationId`
- **Note:** These are NOT bugs — they correctly validate required params

### 9. `window.print()` Used in 4 Modules
- **Files:** SettlementView, GuestLedgerView, DeparturesView (list), ReservationsView
- **Issue:** Prints entire browser page (sidebar, header, tabs) instead of formatted document
- **Fix:** Use FolioView's pattern — open new window with receipt HTML

### 10. Dead Code: `src/lib/print.ts`
- **Issue:** Contains well-built `openPrintDialog()` but imported by zero components

### 11. Shift Handover — Print & Export Are Toast Stubs
- **File:** `src/components/modules/operations/ShiftHandoverView.tsx:430,434`

### 12. Session Hygiene — No TTL Cleanup
- **Issue:** All 15 sessions in DB are expired with no cleanup job
- **Fix:** Add periodic session cleanup (e.g., cron or middleware)

---

## Low Priority Issues

### 13. Folio Balance Inconsistency (Seed Data Only)
- 7 closed folios have `stored balance ≠ computed balance`
- This is seed data, not a code bug

### 14. Staff RBAC Returns 401 Instead of 403
- When staff token is invalid/expired, routes return 401 (correct)
- When staff has valid token but lacks role, routes return 403 (correct)
- The 401/403 distinction is properly implemented

---

## Module Implementation Status

| Module | Status | Notes |
|--------|--------|-------|
| **Auth (Login/Logout/Session)** | ✅ FULL | bcrypt, server sessions, rate limiting, audit |
| **Dashboard** | ✅ FULL | Real KPIs, Nepali date, notifications |
| **Front Desk — Reservations** | ✅ FULL | CRUD, conflict check, fiscal year #, checkbox, hamburger |
| **Front Desk — Arrivals** | ✅ FULL | Filtered reservation list |
| **Front Desk — In-House** | ✅ FULL | Room status, guest info |
| **Front Desk — Check-In** | ✅ FULL | Multi-step wizard, summary sidebar |
| **Front Desk — Departures** | ✅ FULL | Hamburger menu, express checkout |
| **Front Desk — Settlement** | ✅ FULL | Outstanding balance tracking |
| **Front Desk — Folio** | ✅ FULL | Transactions, payments, split, print (email is stub) |
| **Front Desk — Guest Ledger** | ✅ FULL | Cross-folio history |
| **Front Desk — Calendar** | ✅ FULL | Availability calendar |
| **Front Desk — Reports** | ✅ FULL | Front desk reports |
| **Housekeeping — Task Board** | ✅ FULL | Occupied room guard, status changes |
| **Housekeeping — Inspection** | ✅ FULL | Photo capture, checklist, approve/reject |
| **Housekeeping — Lost & Found** | ✅ FULL | Item logging, status |
| **Settings** | ✅ FULL | All categories, save/reset, RBAC |
| **Profile** | ✅ FULL | User profile, password change |
| **POS — Restaurant** | ⚠️ PARTIAL | Order UI works, but kitchen display is basic |
| **POS — Bar/Room Service/Spa** | ⚠️ PARTIAL | UI exists, shares restaurant logic |
| **POS — Daily Sales** | ❌ PLACEHOLDER | 100% mock data |
| **POS — Kitchen Display** | ⚠️ PARTIAL | Basic real-time display |
| **POS — Table Reservations** | ⚠️ PARTIAL | UI exists |
| **Accounting** | ⚠️ PARTIAL | Journal/ledger UI exists, limited real API integration |
| **HR — Employees** | ✅ FULL | CRUD with RBAC |
| **HR — Departments** | ⚠️ PARTIAL | UI exists, basic |
| **HR — Attendance** | ⚠️ PARTIAL | Clock in/out UI |
| **HR — Payroll** | ⚠️ PARTIAL | View exists, calculation is basic |
| **HR — Leave/Schedules/etc** | ⚠️ PARTIAL | UI shells exist |
| **Operations — Night Audit** | ⚠️ PARTIAL | UI exists, core logic basic |
| **Operations — Cashier/Shift** | ⚠️ PARTIAL | Print/export are stubs |
| **Inventory** | ⚠️ PARTIAL | Stock/vendors UI, basic CRUD |
| **Revenue** | ⚠️ PARTIAL | Pricing/demand UI, mock data |
| **CRM** | ⚠️ PARTIAL | Guest profiles linked to main guest system |
| **Events** | ⚠️ PARTIAL | Event/banquet UI, basic CRUD |
| **Channel Manager** | ⚠️ PARTIAL | UI exists, no real OTA integration |
| **Rooms** | ⚠️ PARTIAL | Room types/rates UI, basic |
| **Maintenance** | ⚠️ PARTIAL | Work orders/asset UI, 500 bug on list |
| **Help** | ⚠️ PARTIAL | Help content UI |

---

## Print/Export/Email Feature Inventory

### Print Functions
| # | Module | Function | Status |
|---|--------|----------|--------|
| 1 | FolioView | `handlePrintFolio()` — opens formatted receipt window | ✅ REAL |
| 2 | DeparturesView (receipt) | `handlePrintReceipt()` — formatted receipt | ✅ REAL |
| 3 | CheckInPage | `handlePrintRegistration()` — registration card | ✅ REAL |
| 4 | SettlementView | `window.print()` — prints entire page | ⚠️ PLACEHOLDER |
| 5 | GuestLedgerView | `window.print()` — prints entire page | ⚠️ PLACEHOLDER |
| 6 | DeparturesView (list) | `window.print()` — prints entire page | ⚠️ PLACEHOLDER |
| 7 | ReservationsView | `window.print()` — prints entire page | ⚠️ PLACEHOLDER |
| 8 | ShiftHandoverView | `handlePrint()` — toast stub | ⚠️ PLACEHOLDER |
| 9 | print.ts | `openPrintDialog()` — dead code, never imported | 💀 DEAD CODE |

### Export Functions
| # | Module | Function | Status |
|---|--------|----------|--------|
| 1 | ReservationsView | CSV export with proper headers | ✅ REAL |
| 2 | DeparturesView | CSV export | ✅ REAL |
| 3 | InHouseView | CSV export | ✅ REAL |
| 4 | ArrivalsView | CSV export | ✅ REAL |
| 5 | GuestDirectoryView | CSV export | ✅ REAL |
| 6 | SettlementView | `handleExport()` — toast stub | ⚠️ PLACEHOLDER |
| 7 | GuestLedgerView | `handleExport()` — toast stub | ⚠️ PLACEHOLDER |
| 8 | DailySalesReportView | `handleExport()` — toast stub | ⚠️ PLACEHOLDER |
| 9 | ShiftHandoverView | `handleExport()` — toast stub | ⚠️ PLACEHOLDER |
| 10 | FinancialReportsView | `handleExport()` — toast stub | ⚠️ PLACEHOLDER |

### Email Functions
| # | Module | Function | Status |
|---|--------|----------|--------|
| 1 | FolioView (email dialog) | `handleConfirmEmailFolio()` — shows toast, never calls API | ⚠️ PLACEHOLDER |
| 2 | DeparturesView | `handleEmailReceipt()` — comment says "in production would call API" | ⚠️ PLACEHOLDER |
| 3 | Folio email API route | Full logic but Nodemailer commented out, only console.log | ⚠️ PLACEHOLDER |
| 4 | CheckInPage | Email confirmation — basic implementation | ✅ REAL |

---

## Security Audit Summary

| Check | Result |
|-------|--------|
| All routes require auth (except login/logout) | ✅ 37/37 return 401 |
| RBAC: Admin full access | ✅ |
| RBAC: GM blocked from settings/reset only | ✅ 403 |
| RBAC: GM has payroll + accounting access | ✅ 200 |
| Rate limiting: Login (5/min/IP) | ✅ 429 after 3 failures |
| Password hashing: bcrypt (cost 10) | ✅ |
| Error message leakage | ✅ No Prisma/SQL internals exposed |
| Session management: Server-side with 24h expiry | ✅ |
| Audit logging: 14 event types | ✅ |

---

## Recommendations

### Immediate (Before Production)
1. Fix `db.roomRatePost` → `db.roomRatePosting` in `/api/room-rate-posts/pending`
2. Fix `/api/work-orders` 500 error
3. Replace mock data in POS DailySalesReportView with real API data
4. Connect FolioView email to actual API endpoint
5. Uncomment Nodemailer in folio email API (or integrate email service)

### Short Term
6. Add 8 missing FK indexes to Prisma schema
7. Replace `window.print()` with proper formatted print windows
8. Implement real export (CSV/PDF) for Settlement, Ledger, Reports
9. Add session TTL cleanup job

### Long Term
10. Connect Channel Manager to real OTA APIs
11. Enhance Accounting module with real double-entry posting
12. Add real-time notifications (WebSocket) for HK, POS kitchen
13. Implement proper email service (SendGrid/Resend) for all email features