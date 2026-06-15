---
Task ID: 3i
Agent: SubAgent
Task: Fix GuestLedgerView cross-module invalidation

Work Log:
- Added import for shared `invalidate` helpers
- postMutation → invalidate.afterFolioChange(queryClient, selectedGuestId)
- voidMutation → invalidate.afterFolioChange(queryClient, selectedGuestId)

Stage Summary:
- GuestLedgerView post/void now invalidates folios, in-house, departures, dashboards, folio-view across all modules