---
Task ID: 9
Agent: Main
Task: Implement real Print, Email, and Receipt functionality for Guest Folio and Departure modules

Work Log:
- Read worklog.md and understood project history (PMS hotel system, Next.js 16, shadcn/ui, apiFetch)
- Analyzed FolioView.tsx: found toast stubs at lines 1446 (Print) and 1457 (Email) in FolioDetailPanel
- Analyzed DeparturesView.tsx: found window.open() print approach that gets blocked by popup blockers, and email stub that only showed toast
- Verified existing email API at /api/folio/[id]/email/route.ts — it works, logs email, returns success envelope

Changes Made:

### FolioView.tsx (3 edits):
1. **Added state and handlers inside FolioDetailPanel** (after line 1271):
   - `emailConfirmOpen` state for AlertDialog
   - `emailSending` state for loading indicator
   - `handlePrintFolio` — useCallback that generates A4-formatted HTML receipt with: hotel header (from settings), guest info, room, stay dates, full charges table (date/desc/type/amount/tax/total), full payments table (date/ref/method/amount), balance summary box, footer. Uses hidden iframe approach to avoid popup blockers.
   - `handleOpenEmailDialog` — opens confirmation AlertDialog
   - `confirmEmailFolio` — calls POST /api/folio/{id}/email, shows success/error toast

2. **Replaced Print button toast stub** → `onClick={handlePrintFolio}`
3. **Replaced Email button toast stub** → `onClick={handleOpenEmailDialog} disabled={emailSending}` with dynamic label
4. **Added AlertDialog** for email confirmation before the component's closing div

### DeparturesView.tsx (5 edits):
1. **Added imports**: `Loader2` icon, `AlertDialog` components
2. **Added state**: `emailConfirmOpen`, `emailSending`
3. **Replaced handlePrintReceipt**: Rewrote from window.open() (popup-blocker vulnerable) to iframe approach. Generates comprehensive receipt HTML with hotel header, guest/room info, charges breakdown table, payments breakdown table, balance summary box. Uses `@page { size: 80mm auto }` for thermal receipt format.
4. **Replaced handleEmailReceipt**: Now opens confirmation dialog. Added `confirmEmailReceipt` that calls POST /api/folio/{folioId}/email with proper error handling.
5. **Updated Email Receipt button**: Shows Loader2 spinner when sending, disabled during send
6. **Added AlertDialog** for email confirmation

### Print Approach (both components):
- Uses hidden iframe (0x0, fixed position) instead of window.open()
- Writes HTML into iframe document
- Calls iframe.contentWindow.print() after 250ms delay for DOM readiness
- Cleans up iframe on afterprint event or 60s timeout
- This avoids popup blockers entirely since no new window is opened

### Email Approach (both components):
- Shows AlertDialog confirmation before sending
- Calls existing API: POST /api/folio/{id}/email
- Handles errors with try/catch, shows toast for success/failure
- Button shows loading state during send

Stage Summary:
- Zero lint errors, zero compilation errors
- Print: A4-formatted statement (FolioView) and 80mm receipt format (DeparturesView)
- Email: Confirmation dialog → API call → toast feedback
- No new dependencies added
- All changes are surgical — no component rewrites