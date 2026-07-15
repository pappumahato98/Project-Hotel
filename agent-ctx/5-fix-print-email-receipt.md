---
Task ID: 5
Agent: full-stack-developer
Task: Fix print/email/receipt functionality, folio print/email, split folio responsive

Work Log:
- Replaced window.open() receipt print with hidden iframe approach (bypasses popup blockers) in DeparturesView.tsx
- Implemented real email receipt via POST /api/folio/[id]/email with AlertDialog confirmation in DeparturesView.tsx
- Added emailConfirmOpen and emailSending state variables to DeparturesView.tsx
- Added AlertDialog import to DeparturesView.tsx
- Implemented handlePrintFolio with hidden iframe approach and A4-formatted HTML in FolioView.tsx
- Implemented handleEmailFolio/confirmEmailFolio calling POST /api/folio/[id]/email with AlertDialog in FolioView.tsx
- Added onPrintClick and onEmailClick props to FolioDetailPanel component
- Made split folio dialog responsive with max-w-[95vw] class in FolioView.tsx
- Added RoomTypeBedBadge with inline prop to reservation detail dialog room info in ReservationsView.tsx

Stage Summary:
- Receipt print now works (no popup blocker issue) - uses hidden iframe approach
- Email receipt calls real API endpoint with confirmation dialog
- Folio print generates A4-formatted statement with charges/payments/balance
- Folio email calls real API endpoint with confirmation dialog
- Split folio dialog fits all screen sizes (max-w-[95vw])
- Reservation detail dialog now shows RoomTypeBedBadge with bed type and pax
- Zero lint errors (0 errors, 1 pre-existing warning)