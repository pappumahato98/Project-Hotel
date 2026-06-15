/**
 * Shared query-key constants and cross-module invalidation helpers.
 *
 * Every module that mutates room / reservation / folio / guest data MUST call
 * the appropriate `invalidate*` helper on success so that ALL other modules
 * re-fetch fresh data.
 *
 * Usage in a mutation's onSuccess:
 *   onSuccess: () => {
 *     invalidateAfterCheckIn(queryClient)
 *     // or invalidateAfterCheckout, invalidateAfterReservationChange, etc.
 *   }
 */
import type { QueryClient } from '@tanstack/react-query'

// ─── Query-key factories (single source of truth) ──────────────────────

export const qk = {
  // Rooms
  rooms:        ()           => ['rooms'] as const,
  roomsBoard:   ()           => ['rooms', 'board'] as const,
  roomsTypes:   ()           => ['rooms', 'types'] as const,
  roomsVacant:  ()           => ['rooms', 'vacant'] as const,
  roomsAll:     ()           => ['rooms', 'all'] as const,
  roomsCalendar:()           => ['rooms-calendar'] as const,
  roomsForRes:  ()           => ['rooms-for-reservation'] as const,
  roomsAvail:   ()           => ['rooms-available'] as const,
  vacantRooms:  ()           => ['vacant-rooms'] as const,

  // Reservations
  reservations:         ()               => ['reservations'] as const,
  reservationsCal:      (d: string)      => ['reservations-calendar', d] as const,
  reservationsList:     (...a: unknown[])=> ['reservations', ...a] as const,
  reservation:          (id: string)     => ['reservation', id] as const,
  arrivals:             ()               => ['arrivals'] as const,
  departures:           ()               => ['departures'] as const,
  inHouse:              ()               => ['in-house'] as const,
  roomMoves:            ()               => ['room-moves'] as const,

  // Folios
  folios:          ()               => ['folios'] as const,
  folioDetail:     (id: string)     => ['folio-detail', id] as const,
  folioSearch:     (q: string)      => ['folio-search', q] as const,
  guestFolios:     (id: string)     => ['guest-folios', id] as const,
  guestLedger:     (id: string, ...a: unknown[]) => ['guest-ledger', id, ...a] as const,
  roomRatePostings:(id: string)     => ['room-rate-postings', id] as const,

  // Guests
  guests:          ()               => ['guests'] as const,
  guestSearch:     (q: string)      => ['guest-search', q] as const,
  guestStays:      (id: string)     => ['guest-stays', id] as const,

  // Dashboards
  dashboard:           () => ['dashboard'] as const,
  frontDeskDashboard:  () => ['front-desk-dashboard'] as const,

  // Operations
  operations:      ()               => ['operations'] as const,

  // Calendar
  calendar:        ()               => ['calendar'] as const,
} as const

// ─── Cross-module invalidation helpers ─────────────────────────────────

/** Keys that change when a guest is CHECKED IN. */
function checkInKeys(qc: QueryClient, extra?: readonly [string, ...unknown[]][]) {
  const base = [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.arrivals(), qk.inHouse(), qk.departures(),
    qk.dashboard(), qk.frontDeskDashboard(), qk.guests(),
  ] as const
  base.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
  extra?.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
}

/** Keys that change when a guest is CHECKED OUT. */
function checkoutKeys(qc: QueryClient, extra?: readonly [string, ...unknown[]][]) {
  const base = [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.inHouse(), qk.departures(), qk.arrivals(),
    qk.dashboard(), qk.frontDeskDashboard(), qk.folios(), qk.guests(),
  ] as const
  base.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
  extra?.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
}

/** Keys that change when a RESERVATION is created / updated / cancelled / deleted. */
function reservationChangeKeys(qc: QueryClient, extra?: readonly [string, ...unknown[]][]) {
  const base = [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsForRes(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.arrivals(), qk.departures(), qk.inHouse(),
    qk.dashboard(), qk.frontDeskDashboard(), qk.guests(),
  ] as const
  base.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
  extra?.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
}

/** Keys that change when a FOLIO transaction is posted / payment recorded / voided. */
function folioChangeKeys(qc: QueryClient, guestId?: string | null, extra?: readonly [string, ...unknown[]][]) {
  const base = [
    qk.folios(), qk.inHouse(), qk.departures(), qk.dashboard(),
    qk.frontDeskDashboard(),
  ] as const
  base.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
  if (guestId) {
    qc.invalidateQueries({ queryKey: qk.guestLedger(guestId) as unknown[] })
    qc.invalidateQueries({ queryKey: qk.guestFolios(guestId) as unknown[] })
  }
  extra?.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
}

/** Keys that change when a ROOM TRANSFER happens. */
function roomTransferKeys(qc: QueryClient, extra?: readonly [string, ...unknown[]][]) {
  const base = [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.inHouse(), qk.dashboard(), qk.frontDeskDashboard(),
    qk.roomMoves(),
  ] as const
  base.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
  extra?.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
}

/** Keys that change when a NIGHT AUDIT or DAY CLOSE runs. */
function auditKeys(qc: QueryClient, extra?: readonly [string, ...unknown[]][]) {
  const base = [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.folios(), qk.inHouse(), qk.arrivals(),
    qk.departures(), qk.dashboard(), qk.frontDeskDashboard(),
    qk.operations(), qk.guests(),
  ] as const
  base.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
  extra?.forEach(k => qc.invalidateQueries({ queryKey: k as unknown[] }))
}

// ─── Public API ────────────────────────────────────────────────────────

export const invalidate = {
  /** Call after check-in (room vacant → occupied, reservation → checked_in). */
  afterCheckIn:       (qc: QueryClient)      => checkInKeys(qc),
  /** Call after check-out (room occupied → dirty, reservation → checked_out). */
  afterCheckout:      (qc: QueryClient)      => checkoutKeys(qc),
  /** Call after creating, updating, cancelling, or deleting a reservation. */
  afterReservationChange: (qc: QueryClient)  => reservationChangeKeys(qc),
  /** Call after posting a charge, recording a payment, or voiding a folio entry. */
  afterFolioChange:   (qc: QueryClient, guestId?: string | null) => folioChangeKeys(qc, guestId),
  /** Call after transferring a guest to a different room. */
  afterRoomTransfer:  (qc: QueryClient)      => roomTransferKeys(qc),
  /** Call after running night audit or day close. */
  afterAudit:         (qc: QueryClient)      => auditKeys(qc),
}