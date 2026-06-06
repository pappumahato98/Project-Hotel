---
Task ID: 2
Agent: Front Desk Sub-Views Agent
Task: Add 3 new sub-views to the FrontDesk module (Waitlist, Wake-up Calls, Guest Directory)

Work Log:
- Read worklog.md and existing FrontDeskModule.tsx to understand project patterns, component style, and imports
- Analyzed InHouseView.tsx, ArrivalsView.tsx, FrontDeskDashboard.tsx for styling conventions (Card+CardContent, Badge variant="outline", gap-4 spacing, muted-foreground for secondary text, responsive grid patterns)
- Created WaitlistView.tsx: Summary cards (Total Waitlisted, Avg Wait Time, High Priority, Assigned Today), table with 8 columns (Position, Guest Name, Room Preference, Check-in/out, Pax, Priority, Status, Contact), action buttons (Assign Room, Call, Remove), search + priority/status filters, Add to Waitlist dialog with full form, Assign Room dialog with room picker, color-coded priority badges (red=High, amber=Normal, sky=Low) and status badges (amber=Waiting, emerald=Assigned, slate=Cancelled), 8 mock entries with Nepali and international guest names
- Created WakeUpCallsView.tsx: Card grid layout, each card shows Room #, Guest Name, Scheduled Time, Status badge, Phone Extension, Notes, Snooze count. Status workflow: Pending → Called (green) → Completed, or Snoozed (+15 min amber), or Missed (red). Summary cards (Total Scheduled, Completed, Pending, Missed). Filter tabs (All, Pending, Completed, Missed) + search. Current time indicator with "Upcoming" badge. Add New Wake-up Call dialog. 10 mock entries. Real-time clock updates every minute.
- Created GuestDirectoryView.tsx: Searchable grid of guest cards showing Guest Name, Room #, VIP Level badge, Phone, Email, Nationality, Check-in/out dates, Special Requests. Quick Actions per guest (Call, Message, View Folio, Wake-up Call). Filters: VIP Level, Floor, Room Type + text search. VIP guests highlighted with gold border and special avatar. Summary cards (Total Guests, VIP Guests, Avg Stay Duration, New Today). 12 mock guests with realistic Nepali names.
- Updated FrontDeskModule.tsx: Added imports for WaitlistView, WakeUpCallsView, GuestDirectoryView. Added 3 entries to SUB_MODULE_MAP and SUB_MODULE_LABELS.
- Ran bun run lint — 0 errors
- Dev server running normally

Stage Summary:
- Created: src/components/modules/front-desk/WaitlistView.tsx (waitlist management with CRUD dialogs)
- Created: src/components/modules/front-desk/WakeUpCallsView.tsx (wake-up call management with card grid)
- Created: src/components/modules/front-desk/GuestDirectoryView.tsx (searchable guest directory)
- Updated: src/components/modules/front-desk/FrontDeskModule.tsx (added 3 new tabs: Waitlist, Wake-up Calls, Guest Directory)
- All views use shadcn/ui components, sonner toast, Tailwind CSS responsive classes, lucide-react icons
- All views use 'use client' directive and named exports
- Static mock data with realistic guest data (Nepali names, international guests)
