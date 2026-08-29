# Toast System Migration: `useToast` → `sonner`

## Status

- **Adopted:** `sonner` (`import { toast } from "sonner"`) — already used in 109 files.
- **Deprecated:** `useToast` from `@/hooks/use-toast` — used in 18 files (listed below).
- **Target:** Delete `src/hooks/use-toast.ts`, `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, and the `<Toaster />` mount in `App.tsx` once all call sites migrate.

## Why migrate

1. **Two systems means two UXs.** Radix toasts stack at one corner with `TOAST_LIMIT=1` (only one visible); sonner stacks at another with a queue. Users see inconsistent behavior depending on which code path fires.
2. **sonner has a richer API** — `toast.success/error/warning/info/promise/loading/message/action()`, automatic dismissal, swipe-to-dismiss, and accessibility built in.
3. **Less boilerplate** — `toast.success("Saved")` vs `const { toast } = useToast(); toast({ title: "Saved" })`.
4. **One fewer provider + state machine** — Radix toast requires the in-memory reducer in `use-toast.ts`; sonner is self-contained.

## Call sites to migrate (18)

### Hooks (8)
- [ ] `src/hooks/useReservations.ts`
- [ ] `src/hooks/useRooms.ts`
- [ ] `src/hooks/useGuestFolios.ts`
- [ ] `src/hooks/useGuestMessages.ts`
- [ ] `src/hooks/useFrontDeskQueue.ts`
- [ ] `src/hooks/useFrontDeskSetup.ts`
- [ ] `src/hooks/useNightAudit.ts`
- [ ] `src/hooks/useOTASync.ts`

### Components (9)
- [ ] `src/components/finance/StripeConnect.tsx`
- [ ] `src/components/front-desk/GuestFolioManager.tsx`
- [ ] `src/components/front-desk/InHouseGuestManager.tsx`
- [ ] `src/components/reservations/CheckInOutDialog.tsx`
- [ ] `src/components/reservations/NewReservationDialog.tsx`
- [ ] `src/components/reservations/ReservationCalendar.tsx`
- [ ] `src/components/reservations/ReservationMoveDialog.tsx`
- [ ] `src/components/ui/toaster.tsx` (delete after migration)
- [ ] `src/components/ui/toast.tsx` (delete after migration, only used by `toaster.tsx`)

### Pages (1)
- [ ] `src/pages/Auth.tsx`

## Translation table

| Old (useToast) | New (sonner) |
|---|---|
| `const { toast } = useToast();` | *(remove the line; import `toast` from `sonner` instead)* |
| `toast({ title: "Saved" })` | `toast.success("Saved")` |
| `toast({ title: "Saved", description: "x" })` | `toast.success("Saved", { description: "x" })` |
| `toast({ title: "Err", description: msg, variant: "destructive" })` | `toast.error("Err", { description: msg })` |
| `toast({ title: "Heads up", variant: "default" })` | `toast("Heads up")` or `toast.info("Heads up")` |
| *(no direct equivalent)* | `toast.promise(fn, { loading, success, error })` |
| *(no direct equivalent)* | `toast.warning(msg)` |
| `dismiss(toastId)` | `toast.dismiss(id)` |

## Codemod sketch

```bash
# One-liner codemod using perl (run from repo root, then manually review diffs).
# Replace USE_TOAST lines:
grep -rl 'useToast()' src/ | while read f; do
  perl -i -pe 's/import \{ useToast \} from "@\/hooks\/use-toast";/import { toast } from "sonner";/g' "$f"
  perl -i -0pe 's/const \{ toast \} = useToast\(\);\n//g' "$f"
  perl -i -pe 's/toast\(\{ title: ("[^"]+"|\w+), description: ("[^"]+"|\w+), variant: "destructive" \}\)/toast.error($1, { description: $2 })/g' "$f"
  perl -i -pe 's/toast\(\{ title: ("[^"]+"|\w+), variant: "destructive" \}\)/toast.error($1)/g' "$f"
  perl -i -pe 's/toast\(\{ title: ("[^"]+"|\w+) \}\)/toast.success($1)/g' "$f"
done
```

## Verification

1. `grep -r 'useToast\|use-toast' src/` returns only `src/hooks/use-toast.ts` itself (the file itself).
2. `pnpm build` succeeds with no new type errors.
3. Manually exercise each migrated call site: success toast, error toast, description-bearing toast.
4. Remove `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, `src/hooks/use-toast.ts`.
5. Remove `<Toaster />` import + JSX from `src/App.tsx`. Keep `<Sonner />`.
6. Remove the `use-toast` line from `.gitignore` if it was added (it wasn't).

## Rollout plan

- **Week 1:** Migrate the 8 hooks (mechanical, low risk). Each PR ≤ 1 hook.
- **Week 2:** Migrate the 8 components + 1 page. Each PR ≤ 1 component.
- **Week 3:** Delete legacy files + `<Toaster />` mount. Add ESLint rule
  `no-restricted-imports` to ban `@/hooks/use-toast` going forward.
