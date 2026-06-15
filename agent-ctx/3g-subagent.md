---
Task ID: 3g
Agent: SubAgent
Task: Fix NewReservationPage cross-module invalidation

Work Log:
- Added import for shared `invalidate` helpers
- createReservation → invalidate.afterReservationChange

Stage Summary:
- NewReservationPage now invalidates rooms, arrivals, departures, dashboards, etc. on reservation creation