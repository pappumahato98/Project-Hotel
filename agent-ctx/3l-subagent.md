---
Task ID: 3l
Agent: SubAgent
Task: Fix ReservationCalendarView cross-module invalidation

Work Log:
- Added import for shared `invalidate` helpers
- updateDatesMutation → invalidate.afterReservationChange
- createMutation → invalidate.afterReservationChange
- Kept component-specific reservations-calendar invalidation

Stage Summary:
- ReservationCalendarView drag-resize and create now invalidate rooms, arrivals, departures, dashboards, etc.