# Task 3-b — Room Rate Posting API

## Files Created

### `src/app/api/room-rate-posting/route.ts`
- **GET** `?reservationId=xxx` — Fetch all posted rate postings for a reservation, includes folio with room transactions, sorted by postingDate asc.
- **POST** — Post daily room charges to guest folios.
  - Accepts `{ reservationId, dates?, postedBy? }`
  - Auto-calculates all nights from checkIn to checkOut-1 if no dates provided
  - Deduplicates: skips nights already posted (status="posted")
  - Reads `taxRate` and `serviceCharge` from `SystemSetting`
  - Creates `RoomRatePosting` + `FolioTransaction` (room charge) + `FolioTransaction` (service charge, if > 0)
  - Links transactions via `reference` field: posting ID for room charge, `postingId-sc` for service charge
  - Recalculates folio balance and reservation totals
- **DELETE** `?id=xxx` — Void a rate posting, zero out linked folio transactions, recalculate balances

### `src/app/api/room-rate-posting/[id]/route.ts`
- **PATCH** — Void a posting with `{ voidedBy?, voidReason }` (voidReason required)
  - Sets posting status to "voided"
  - Zeros out linked folio transactions (matched by reference field)
  - Recalculates folio balance and reservation totals

## Key Design Decisions
- FolioTransaction `reference` field used to link back to RoomRatePosting (no schema FK exists)
- Amounts rounded to 2 decimal places
- Service charge creates a separate folio transaction for clean accounting
- Reservation totals recalculated across ALL folios (not just the primary one)