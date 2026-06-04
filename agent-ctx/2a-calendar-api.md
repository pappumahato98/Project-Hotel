# Task 2-a: Calendar API Route

## Status: ✅ Completed

## File Created
- `src/app/api/calendar/route.ts`

## Implementation Details

### GET `/api/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Default Date Range:** If no query params provided, defaults to `today - 3 days` through `today + 13 days` (14-day window).

**Response Shape:**
```json
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "rooms": [...],
  "reservations": [...],
  "summary": {
    "totalRooms": number,
    "totalReservations": number,
    "arrivals": number,
    "departures": number,
    "inHouse": number
  }
}
```

### Rooms
- Filtered by first property found in database
- Ordered by `floor ASC, number ASC`
- Includes related `RoomType` info (name, code, bedConfig, occupancy)

### Reservations
- Overlap filter: `checkIn < endDate AND checkOut > startDate`
- Status filter: excludes `cancelled`, `no_show`, `checked_out`
- Ordered by `checkIn ASC`
- Includes: guest (name, email, phone, vipLevel, nationality), room (number, floor, wing, type), folios (id, type, status, balance)

### Summary
- **totalRooms**: Count of all rooms for the property
- **totalReservations**: Count of active overlapping reservations
- **arrivals**: Reservations with checkIn within [startDate, endDate)
- **departures**: Reservations with checkOut within (startDate, endDate]
- **inHouse**: Reservations with status `checked_in`

### Error Handling
- 400: Invalid date format, startDate >= endDate, no property configured
- 500: Server errors with logging

### Lint
- No lint errors in new file. Pre-existing lint errors in `CalendarView.tsx` are unrelated.
