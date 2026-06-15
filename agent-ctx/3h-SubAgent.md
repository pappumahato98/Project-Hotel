---
Task ID: 3h
Agent: SubAgent
Task: Fix FolioView cross-module invalidation

Work Log:
- Added import for shared `invalidate` helpers
- postChargeMutation → invalidate.afterFolioChange
- recordPaymentMutation → invalidate.afterFolioChange
- voidMutation → invalidate.afterFolioChange
- Kept component-specific folio-detail invalidation

Stage Summary:
- FolioView charge/payment/void now invalidates in-house, departures, dashboards across all modules
