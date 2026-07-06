# Task 2-b: Replace hardcoded mock data in HR Schedules view with API data

## Changes Made

### 1. `/api/employees/route.ts` — Added `section=schedules` handler

- Added `generateWeeklySchedule()` helper function that creates deterministic shift patterns based on employee ID hash + department
- Department-based shift pools:
  - **Front Desk**: morning/evening rotation, weekend off
  - **Housekeeping**: all morning shifts, weekend off
  - **Food & Beverage**: morning/evening mix, 2 days off
  - **Kitchen**: mostly morning, 1 evening, weekend off
  - **Engineering**: all morning, weekend off
  - **Security**: night shifts with 1 day off rotating by hash
  - **Spa & Wellness**: morning/evening mix, 2 days off
- New `section=schedules` branch in GET handler: fetches active employees, generates weekly schedule for each, returns `ShiftEntry[]`
- Existing default handler preserved unchanged

### 2. `src/components/modules/hr/SchedulesView.tsx` — Replaced mock data with API

- Added imports: `useMemo` (react), `useQuery` (tanstack/react-query), `apiFetch` (lib/api), `Skeleton` (ui/skeleton), `AlertTriangle` (lucide)
- Removed imports: `Badge`, `CardHeader`, `CardTitle` (unused)
- **Deleted** the entire `PLACEHOLDER_SCHEDULE` array (13 hardcoded entries)
- **Deleted** the hardcoded `DEPARTMENTS` array
- Added `fetchSchedules()` function calling `/api/employees?section=schedules`
- Added `useQuery` with key `['employees', 'schedules']` returning `ShiftEntry[]`
- Department dropdown now built dynamically from API data via `useMemo`
- Added `activeDept` computed value that resets filter if selected department disappears
- Added **loading skeleton**: 8 rows with Skeleton components matching grid layout
- Added **error state**: destructive-styled Card with AlertTriangle icon and user-friendly message
- Grid rows only render when `!isLoading`
- All existing UI/UX preserved: week navigator, summary cards, shift legend, CSV export, department filtering, hover effects

### Lint Results
- Both changed files pass ESLint with zero errors/warnings
- Pre-existing lint error in `ArrivalsView.tsx` (unrelated) was the only failure