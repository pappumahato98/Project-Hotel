---
Task ID: 3-c
Agent: Backend Agent
Task: Create backend API routes for Guest Documents

Files Created:
- src/app/api/guest-documents/route.ts
- src/app/api/guest-documents/[id]/route.ts

Work Log:
- Created GET /api/guest-documents?reservationId=xxx — validates reservationId param, verifies reservation exists, returns documents sorted by createdAt desc
- Created POST /api/guest-documents — validates required fields (reservationId, docType), validates docType against allowed set, verifies reservation exists, parses ISO date strings for docExpiry/issueDate, returns 201 with created record
- Created GET /api/guest-documents/[id] — returns single document with reservation confirmationNo
- Created PATCH /api/guest-documents/[id] — whitelisted field updates, date parsing for docExpiry/issueDate, validates document exists before update
- Created DELETE /api/guest-documents/[id] — validates document exists before deletion
- Ran lint — 0 errors

HTTP Status Codes Used:
- 200: Successful GET, PATCH
- 201: Successful POST (created)
- 400: Missing/invalid params
- 404: Reservation or document not found
- 500: Server errors