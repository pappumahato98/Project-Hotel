/**
 * Shared query-key constants and cross-module invalidation helpers.
 *
 * PERFORMANCE OPTIMIZED: Invalidations use `refetchType: 'none'` to mark
 * queries as stale WITHOUT triggering immediate refetches. Only queries
 * currently being observed (visible on screen) will refetch on next
 * observation cycle. This prevents 8-14 request storms per mutation.
 */
import type { QueryClient } from '@tanstack/react-query'

// ─── Query-key factories (single source of truth) ──────────────────────

export const qk = {
  // Rooms — normalized: all room queries share base key
  rooms:        ()           => ['rooms'] as const,
  roomsBoard:   ()           => ['rooms', 'board'] as const,
  roomsTypes:   ()           => ['rooms', 'types'] as const,
  roomsVacant:  ()           => ['rooms', 'vacant'] as const,
  roomsAll:     ()           => ['rooms', 'all'] as const,
  roomsCalendar:()           => ['rooms-calendar'] as const,
  roomsForRes:  ()           => ['rooms-for-reservation'] as const,
  vacantRooms:  ()           => ['vacant-rooms'] as const,

  // Reservations
  reservations:         ()               => ['reservations'] as const,
  arrivals:             ()               => ['arrivals'] as const,
  departures:           ()               => ['departures'] as const,
  inHouse:              ()               => ['in-house'] as const,
  roomMoves:            ()               => ['room-moves'] as const,

  // Folios
  folios:          ()               => ['folios'] as const,
  guestFolios:     (id: string)     => ['guest-folios', id] as const,
  guestLedger:     (id: string, ...a: unknown[]) => ['guest-ledger', id, ...a] as const,

  // Guests
  guests:          ()               => ['guests'] as const,

  // Dashboards
  dashboard:           () => ['dashboard'] as const,
  frontDeskDashboard:  () => ['front-desk-dashboard'] as const,

  // Operations
  operations:      ()               => ['operations'] as const,

  // Waitlist
  waitlist:        ()               => ['waitlist'] as const,

  // Wake-up Calls
  wakeUpCalls:     (d?: string)     => ['wake-up-calls', d] as const,

  // Housekeeping
  housekeeping:    ()               => ['housekeeping'] as const,
} as const

// ─── Optimized invalidation: stale-only, no immediate refetch storm ────

/**
 * Mark queries as stale WITHOUT triggering immediate refetch.
 * Only actively-observed queries will refetch on their next cycle.
 * This prevents 8-14 simultaneous requests per mutation.
 */
function softInvalidate(qc: QueryClient, keys: readonly (readonly [string, ...unknown[]])[]) {
  for (const k of keys) {
    qc.invalidateQueries({ queryKey: k as unknown[], refetchType: 'none' })
  }
}

/**
 * Actively refetch only the specified keys (for current view).
 * Use this for 1-2 keys the user is currently looking at.
 */
function activeRefetch(qc: QueryClient, keys: readonly (readonly [string, ...unknown[]])[]) {
  for (const k of keys) {
    qc.invalidateQueries({ queryKey: k as unknown[], refetchType: 'active' })
  }
}

// ─── Cross-module invalidation helpers ─────────────────────────────────

/** Call after check-in. Soft-invalidates all, actively refetches rooms + dashboard. */
export function invalidateAfterCheckIn(qc: QueryClient) {
  softInvalidate(qc, [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.arrivals(), qk.inHouse(), qk.departures(),
    qk.dashboard(), qk.frontDeskDashboard(), qk.folios(), qk.guests(),
  ])
  // Only actively refetch what the user is likely looking at
  activeRefetch(qc, [qk.roomsBoard(), qk.inHouse(), qk.frontDeskDashboard()])
}

/** Call after check-out. Soft-invalidates all, actively refetches rooms + dashboard. */
export function invalidateAfterCheckout(qc: QueryClient) {
  softInvalidate(qc, [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.inHouse(), qk.departures(), qk.arrivals(),
    qk.dashboard(), qk.frontDeskDashboard(), qk.folios(), qk.guests(),
  ])
  activeRefetch(qc, [qk.roomsBoard(), qk.departures(), qk.frontDeskDashboard()])
}

/** Call after reservation create/update/cancel/delete. */
export function invalidateAfterReservationChange(qc: QueryClient) {
  softInvalidate(qc, [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsForRes(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.arrivals(), qk.departures(), qk.inHouse(),
    qk.dashboard(), qk.frontDeskDashboard(), qk.guests(),
  ])
  activeRefetch(qc, [qk.reservations(), qk.arrivals(), qk.dashboard()])
}

/** Call after folio charge/payment/void. */
export function invalidateAfterFolioChange(qc: QueryClient, guestId?: string | null) {
  softInvalidate(qc, [
    qk.folios(), qk.inHouse(), qk.departures(),
    qk.dashboard(), qk.frontDeskDashboard(),
  ])
  if (guestId) {
    qc.invalidateQueries({ queryKey: qk.guestLedger(guestId) as unknown[], refetchType: 'active' })
    qc.invalidateQueries({ queryKey: qk.guestFolios(guestId) as unknown[], refetchType: 'active' })
  }
  activeRefetch(qc, [qk.folios(), qk.frontDeskDashboard()])
}

/** Call after room transfer. */
export function invalidateAfterRoomTransfer(qc: QueryClient) {
  softInvalidate(qc, [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.inHouse(), qk.dashboard(), qk.frontDeskDashboard(),
    qk.roomMoves(),
  ])
  activeRefetch(qc, [qk.roomsBoard(), qk.inHouse(), qk.frontDeskDashboard()])
}

/** Call after night audit / day close. */
export function invalidateAfterAudit(qc: QueryClient) {
  softInvalidate(qc, [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.reservations(), qk.folios(), qk.inHouse(), qk.arrivals(),
    qk.departures(), qk.dashboard(), qk.frontDeskDashboard(),
    qk.operations(), qk.guests(),
  ])
  // Night audit: actively refetch everything since it's a major event
  activeRefetch(qc, [qk.roomsBoard(), qk.dashboard(), qk.operations(), qk.frontDeskDashboard()])
}

/** Call after room status change (HK cleaning → inspected → vacant). */
export function invalidateAfterRoomStatusChange(qc: QueryClient) {
  softInvalidate(qc, [
    qk.rooms(), qk.roomsBoard(), qk.roomsTypes(), qk.roomsAll(),
    qk.roomsCalendar(), qk.roomsVacant(), qk.vacantRooms(),
    qk.frontDeskDashboard(), qk.dashboard(), qk.housekeeping(),
  ])
  activeRefetch(qc, [qk.roomsBoard(), qk.housekeeping(), qk.frontDeskDashboard()])
}

/** Call after posting a folio charge from POS / external module. */
export function invalidateAfterFolioCharge(qc: QueryClient) {
  softInvalidate(qc, [
    qk.folios(), qk.inHouse(), qk.departures(),
    qk.dashboard(), qk.frontDeskDashboard(),
  ])
  activeRefetch(qc, [qk.folios(), qk.frontDeskDashboard()])
}

// ─── Public API (backward-compatible) ──────────────────────────────────

export const invalidate = {
  afterCheckIn:           invalidateAfterCheckIn,
  afterCheckout:          invalidateAfterCheckout,
  afterReservationChange: invalidateAfterReservationChange,
  afterFolioChange:       invalidateAfterFolioChange,
  afterRoomTransfer:      invalidateAfterRoomTransfer,
  afterAudit:             invalidateAfterAudit,
  afterRoomStatusChange:  invalidateAfterRoomStatusChange,
  afterFolioCharge:       invalidateAfterFolioCharge,
}
