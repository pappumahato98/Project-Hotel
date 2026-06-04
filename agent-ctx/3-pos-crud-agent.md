---
Task ID: 3
Agent: pos-crud-agent
Task: Wire up POS module frontend to backend API

Work Log:
- Read all POS view files: RestaurantView.tsx, BarView.tsx, SpaView.tsx, BusinessCenterView.tsx
- Read /api/pos/route.ts to understand existing API actions (create_order, update_order_status, update_item_status)
- Read pos-types.ts for hooks (usePosData) and type definitions
- Read prisma/schema.prisma for PosOrder, OrderItem, Outlet, MenuItem models
- Added 5 new POST actions to /api/pos/route.ts:
  1. add_order_item — adds items to an existing PosOrder, recalculates totals
  2. update_order_item — updates item quantity, voids if quantity <= 0, recalculates totals
  3. create_bar_tab — creates new bar tab as PosOrder, auto-finds bar outlet
  4. create_spa_appointment — creates spa appointment as PosOrder with service MenuItem (upserted)
  5. create_biz_rental — creates business center rental as PosOrder with service MenuItem (upserted)
- Updated GET handlers for bar, spa, and business-center to merge DB data with static mock data
- Wired up RestaurantView.tsx with 5 mutations (createOrder, addItem, updateOrderItem, voidItem, closeOrder)
- Wired up BarView.tsx with 3 mutations (createTab, addBarItem, closeTab) and new tab dialog
- Wired up SpaView.tsx with 2 mutations (bookAppointment, updateAppointmentStatus) and controlled booking form
- Wired up BusinessCenterView.tsx with 3 mutations (startRental, chargeService, endRental) and controlled dialogs
- All mutations invalidate ['pos'] queryKey on success with toast notifications
- Loading states shown with isPending spinner animations
- Ran bun run lint: zero errors

Stage Summary:
- All 4 POS views now create/update data via API
- Orders, tabs, appointments, rentals persisted to SQLite database via Prisma
- Proper cache invalidation on all mutations via queryClient.invalidateQueries
- Zero lint errors
