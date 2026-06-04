# Task 2-b: CalendarView Component

## Summary
Created a comprehensive, production-ready Reservation Calendar View component at `src/components/modules/front-desk/CalendarView.tsx`.

## What Was Built

### Gantt-Style Calendar Grid
- **Left panel (fixed)**: Room numbers with room type code, wing info, and color-coded status dot
- **Right panel (scrollable)**: 14-day date columns with reservation blocks spanning from check-in to check-out
- Reservation blocks are absolutely positioned within rows, calculating left offset and width from date range
- Today's column has subtle highlight with vertical indicator line
- Weekend columns have slightly different background tinting

### Color Coding (as specified)
1. **Confirmed** → Blue: `bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-l-blue-500`
2. **Arrival Today** → Green: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-l-emerald-500`
3. **Checked-In** → Amber: `bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-l-amber-500`
4. **Departure Today** → Rose: `bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-l-rose-500`
5. **Tentative** → Slate: `bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-l-slate-400`

### Room Status Dots
- vacant_clean: green, occupied: blue, cleaning/cleaned: amber, out_of_order: red, inspected: purple

### Interactions
1. **Double-click on empty cell** → Opens "New Reservation" dialog with room and date pre-filled
2. **Single-click on reservation block** → Opens "Reservation Detail" dialog with context-dependent action buttons
3. **Navigation**: Prev/Next Week + "Today" button to jump to current date range
4. **Auto-scroll**: On mount, scrolls to today's column automatically

### Context-Dependent Action Buttons
- **Confirmed**: "Edit", "Check-In", "Cancel"
- **Checked-In**: "View Folio", "Add Note", "Early Checkout"
- **Arrival Today**: "Check-In", "Edit", "Cancel"
- **Departure Today**: "Check-Out", "Extend Stay"
- **Tentative**: "Edit", "Confirm", "Cancel"

### Dialogs
- **Reservation Detail Dialog**: Full guest info, stay details, financial info, notes, folio balance
- **New Reservation Dialog**: Guest selection/create, room, dates, rate, source, special requests, guaranteed checkbox, estimated total
- **Add Note Dialog**: With previous notes display
- **Cancel Confirmation Dialog**: AlertDialog for safe cancellation

### Stats Cards
- Arrivals, Departures, In-House, Occupancy percentage

### Technical Details
- Uses `useQuery` to fetch rooms and reservations from existing APIs
- Uses `useMutation` for status changes, reservation creation, and note adding
- Uses `React.Fragment` with key for dynamic list items
- Uses `cn()` for all conditional classes
- Responsive design with proper max-height scrolling
- TooltipProvider wraps the component for reservation block tooltips
- Loading states with Skeleton, empty states with illustrations
- All dates compared as YYYY-MM-DD strings for consistency
- Named export: `export function CalendarView()`
- ESLint passes with no errors
