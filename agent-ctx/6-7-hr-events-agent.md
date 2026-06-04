# Task 6-7: HR and Events Module Wiring

## Files Modified

### HR Module
1. **EmployeesView.tsx** - Full CRUD wired up
   - "Add Employee" button → Dialog with form (firstName, lastName, email, phone, department Select, position, role Select, salary, startDate, status Select, emergencyContact)
   - Edit button on each row → Pre-filled Dialog
   - Delete button on each row → AlertDialog confirmation
   - `useMutation` for POST/PATCH/DELETE `/api/employees`
   
2. **AttendanceView.tsx** - Clock In/Out wired up
   - "Clock In" button → Dialog with employee Select dropdown (fetched from /api/employees)
   - POST `/api/attendance` with employeeId, date: today, checkIn: now
   - "Clock Out" button on each today's attendance record
   - PATCH `/api/attendance/[id]` with checkOut: now
   
3. **PayrollView.tsx** - Generate/Process actions wired up
   - "Generate" button → AlertDialog confirmation → POST `/api/payroll`
   - "Process" button → PATCH `/api/payroll` with status: processed
   - Export button kept as toast notification

### Events Module
4. **EventsView.tsx** - Full CRUD wired up
   - "Create Event" button → Dialog with form (name, eventType Select, venue, startDate, endDate, expectedPax, contactPerson, contactPhone, contactEmail, depositAmount, totalAmount, notes, description)
   - Edit button on each row → Pre-filled Dialog
   - Delete button on each row → AlertDialog confirmation
   - `useMutation` for POST/PATCH/DELETE `/api/events`
   
5. **BanquetOrdersView.tsx** - Create BEO + status updates wired up
   - "Create BEO" button → Dialog with event Select, dynamic items list (itemName, quantity, notes), specialInstructions, dietaryRequirements, setupNotes, serviceTime
   - Inline status Select dropdown on each BEO card → PATCH `/api/banquet-orders/[id]`
   - POST `/api/banquet-orders`

## Technical Details
- All mutations use `@tanstack/react-query` `useMutation` with proper `queryClient.invalidateQueries`
- Loading states: `Loader2` spinner with `animate-spin` on submit buttons
- Toast notifications via `sonner` for all success/error states
- AlertDialog for destructive actions (delete)
- shadcn/ui components used: Dialog, AlertDialog, Select, Input, Label, Textarea, Button, Badge, Table, Card, ScrollArea
- Zero lint errors
