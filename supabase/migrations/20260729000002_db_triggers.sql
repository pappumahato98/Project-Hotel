-- =============================================================================
-- SUPABASE DATABASE TRIGGERS — Meridian Hotel PMS
-- =============================================================================
-- Reactive database logic that fires automatically on INSERT / UPDATE / DELETE.
-- Organized by module:
--   1. Reservation & Room Status (auto room state changes)
--   2. Folio Balance Auto-Sync (transactions ↔ balance)
--   3. Activity & Audit Logging (auto-log key events)
--   4. Guest CRM Stats (stay count, revenue tracking)
--   5. POS Order Totals (auto-calculate from items)
--   6. Inventory Alerts (low stock notification)
--   7. Payment Sync (paid amount ↔ reservation)
--   8. Work Order → Room Status (emergency auto out-of-order)
--   9. Journal Entry Validation (debit/credit balance check)
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. RESERVATION → ROOM STATUS AUTO-SYNC
-- ═══════════════════════════════════════════════════════════════════════════════
-- When a reservation is checked in → room becomes "occupied"
-- When a reservation is checked out → room becomes "vacant_dirty" + auto HK task
-- When a reservation is cancelled → if room was assigned, release it

CREATE OR REPLACE FUNCTION fn_sync_room_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_id TEXT;
BEGIN
  -- Only act when status changes AND a room is assigned
  IF (TG_OP = 'UPDATE') AND OLD.status IS DISTINCT FROM NEW.status AND NEW."roomId" IS NOT NULL THEN
    v_room_id := NEW."roomId";

    CASE NEW.status
      -- CHECK-IN: mark room occupied
      WHEN 'checked_in' THEN
        UPDATE public."Room" SET status = 'occupied' WHERE id = v_room_id;

      -- CHECK-OUT: mark room vacant_dirty and auto-create HK checkout task
      WHEN 'checked_out' THEN
        UPDATE public."Room" SET status = 'vacant_dirty' WHERE id = v_room_id;

        INSERT INTO public."HkTask" ("id", "roomId", "taskType", "status", "priority", "scheduledTime", "estimatedMinutes", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          v_room_id,
          'checkout',
          'pending',
          'normal',
          NOW(),
          30,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING;  -- no PK conflict, safety guard

      -- CANCELLATION: if room was occupied by this reservation, release it
      WHEN 'cancelled' THEN
        IF OLD.status = 'checked_in' THEN
          UPDATE public."Room" SET status = 'vacant_dirty' WHERE id = v_room_id AND status = 'occupied';
        END IF;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_room_status
  AFTER UPDATE ON public."Reservation"
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_room_on_reservation();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FOLIO BALANCE AUTO-SYNC
-- ═══════════════════════════════════════════════════════════════════════════════
-- Recalculates Folio.balance whenever transactions or payments change.
-- balance = SUM(transactions.totalAmount) - SUM(payments.amount)

CREATE OR REPLACE FUNCTION fn_recalc_folio_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_folio_id TEXT;
BEGIN
  -- Determine which folio to recalculate
  IF TG_OP = 'DELETE' THEN
    v_folio_id := OLD."folioId";
  ELSE
    v_folio_id := NEW."folioId";
  END IF;

  IF v_folio_id IS NOT NULL THEN
    UPDATE public."Folio"
    SET balance = COALESCE(
      (SELECT SUM(ft."totalAmount")
       FROM public."FolioTransaction" ft
       WHERE ft."folioId" = v_folio_id AND ft."createdAt" <= COALESCE(NEW."createdAt", OLD."createdAt", NOW())
      ), 0)
    - COALESCE(
      (SELECT SUM(fp.amount)
       FROM public."FolioPayment" fp
       WHERE fp."folioId" = v_folio_id AND fp."createdAt" <= COALESCE(NEW."createdAt", OLD."createdAt", NOW())
      ), 0),
    "updatedAt" = NOW()
    WHERE id = v_folio_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on FolioTransaction INSERT / UPDATE / DELETE
CREATE TRIGGER trg_folio_trans_balance
  AFTER INSERT OR UPDATE OR DELETE ON public."FolioTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalc_folio_balance();

-- Trigger on FolioPayment INSERT / UPDATE / DELETE
CREATE TRIGGER trg_folio_payment_balance
  AFTER INSERT OR UPDATE OR DELETE ON public."FolioPayment"
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalc_folio_balance();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AUTO-ACTIVITY LOGGING FOR RESERVATION STATUS CHANGES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Automatically creates ActivityLog entries when reservation status transitions.

CREATE OR REPLACE FUNCTION fn_log_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_action TEXT;
  v_details TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE NEW.status
      WHEN 'confirmed'    THEN 'reservation_confirmed'
      WHEN 'checked_in'   THEN 'check_in'
      WHEN 'checked_out'  THEN 'check_out'
      WHEN 'cancelled'    THEN 'reservation_cancelled'
      WHEN 'no_show'      THEN 'no_show_marked'
      ELSE 'reservation_status_change'
    END;

    v_details := format(
      'Reservation %s status changed: %s → %s',
      NEW."confirmationNo",
      COALESCE(OLD.status, 'none'),
      NEW.status
    );

    INSERT INTO public."ActivityLog" ("id", "userId", "userName", "action", "module", "details", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      COALESCE(NEW."bookedBy", 'system'),
      'System',
      v_action,
      'Front Desk',
      v_details,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_status_log
  AFTER UPDATE ON public."Reservation"
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_reservation_status_change();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. GUEST CRM STATS — Auto-update on check-out
-- ═══════════════════════════════════════════════════════════════════════════════
-- When a reservation is checked out, update the guest's lifetime stats:
--   totalStays += 1, totalRevenue += reservation totalAmount, lastStayAt = now

CREATE OR REPLACE FUNCTION fn_update_guest_stats_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' AND NEW."guestId" IS NOT NULL THEN
    UPDATE public."Guest"
    SET
      "totalStays"    = "totalStays" + 1,
      "totalRevenue"  = "totalRevenue" + COALESCE(NEW."totalAmount", 0),
      "lastStayAt"    = NOW(),
      "updatedAt"      = NOW()
    WHERE id = NEW."guestId";

    -- Auto-upgrade loyalty tier based on total stays
    UPDATE public."Guest"
    SET
      "loyaltyTier"   = CASE
                          WHEN "totalStays" >= 20 THEN 'platinum'
                          WHEN "totalStays" >= 10 THEN 'gold'
                          WHEN "totalStays" >= 5  THEN 'silver'
                          ELSE 'none'
                        END,
      "loyaltyPoints" = "loyaltyPoints" + FLOOR(COALESCE(NEW."totalAmount", 0) / 100),
      "vipLevel"      = CASE
                          WHEN "totalStays" >= 15 THEN 'platinum'
                          WHEN "totalStays" >= 8  THEN 'gold'
                          WHEN "totalStays" >= 3  THEN 'silver'
                          ELSE 'none'
                        END
    WHERE id = NEW."guestId";
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guest_stats_checkout
  AFTER UPDATE ON public."Reservation"
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_guest_stats_on_checkout();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. POS ORDER TOTALS — Auto-calculate from order items
-- ═══════════════════════════════════════════════════════════════════════════════
-- Recalculates PosOrder.totalAmount whenever OrderItems change.

CREATE OR REPLACE FUNCTION fn_recalc_pos_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD."orderId";
  ELSE
    v_order_id := NEW."orderId";
  END IF;

  IF v_order_id IS NOT NULL THEN
    UPDATE public."PosOrder"
    SET "totalAmount" = COALESCE(
      (SELECT SUM(oi."totalPrice")
       FROM public."OrderItem" oi
       WHERE oi."orderId" = v_order_id
      ), 0
    ),
    "updatedAt" = NOW()
    WHERE id = v_order_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_pos_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public."OrderItem"
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalc_pos_order_total();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. INVENTORY LOW-STOCK ALERT
-- ═══════════════════════════════════════════════════════════════════════════════
-- When an InventoryItem's currentStock drops to or below reorderPoint,
-- log a SecurityEvent for notification (frontend polls these).

CREATE OR REPLACE FUNCTION fn_alert_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."currentStock" <= NEW."reorderPoint" AND OLD."currentStock" > NEW."reorderPoint" THEN
    INSERT INTO public."SecurityEvent" ("id", "type", "level", "details", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      'low_stock_alert',
      'warning',
      format('LOW STOCK: "%s" (ID: %s) — current: %s, reorder point: %s',
        NEW.name, NEW.id, NEW."currentStock", NEW."reorderPoint"),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_low_stock
  AFTER UPDATE ON public."InventoryItem"
  FOR EACH ROW
  EXECUTE FUNCTION fn_alert_low_stock();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. PAYMENT → RESERVATION PAID AMOUNT SYNC
-- ═══════════════════════════════════════════════════════════════════════════════
-- When a FolioPayment is completed, update the reservation's paidAmount.

CREATE OR REPLACE FUNCTION fn_sync_reservation_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_folio RECORD;
  v_res_id TEXT;
BEGIN
  -- Only on INSERT or UPDATE where status is completed
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'completed'))
     AND NEW.status = 'completed' THEN
    -- Find the folio and its reservation
    SELECT "reservationId" INTO v_res_id
    FROM public."Folio"
    WHERE id = NEW."folioId";

    IF v_res_id IS NOT NULL THEN
      -- Sum all completed payments for this folio
      UPDATE public."Reservation"
      SET "paidAmount" = (
        SELECT COALESCE(SUM(fp.amount), 0)
        FROM public."FolioPayment" fp
        JOIN public."Folio" f ON fp."folioId" = f.id
        WHERE f."reservationId" = v_res_id AND fp.status = 'completed'
      ),
      "paymentStatus" = CASE
        WHEN ("totalAmount" - COALESCE((
          SELECT SUM(fp.amount)
          FROM public."FolioPayment" fp
          JOIN public."Folio" f ON fp."folioId" = f.id
          WHERE f."reservationId" = v_res_id AND fp.status = 'completed'
        ), 0)) <= 0 THEN 'paid'
        ELSE 'partial'
      END,
      "updatedAt" = NOW()
      WHERE id = v_res_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_sync_reservation
  AFTER INSERT OR UPDATE ON public."FolioPayment"
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_reservation_paid();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. WORK ORDER → ROOM STATUS (Emergency auto out-of-order)
-- ═══════════════════════════════════════════════════════════════════════════════
-- When an emergency work order is created for a room, auto-set room to out_of_order.
-- When the work order is completed, revert to previous status if room was out_of_order.

CREATE OR REPLACE FUNCTION fn_work_order_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."roomId" IS NOT NULL THEN
    -- Emergency work order created → room out_of_order
    IF TG_OP = 'INSERT' AND NEW.priority = 'emergency' THEN
      UPDATE public."Room" SET status = 'out_of_order' WHERE id = NEW."roomId" AND status != 'out_of_order';
    END IF;

    -- Emergency work order completed → restore room
    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' AND OLD.priority = 'emergency' THEN
      UPDATE public."Room"
      SET status = 'vacant_dirty'  -- safe default: needs inspection after emergency repair
      WHERE id = NEW."roomId" AND status = 'out_of_order';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_room
  AFTER INSERT OR UPDATE ON public."WorkOrder"
  FOR EACH ROW
  EXECUTE FUNCTION fn_work_order_room_status();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. JOURNAL ENTRY BALANCE VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- Prevents posting a JournalEntry if total debits ≠ total credits.
-- This is a BEFORE trigger that raises an exception on invalid entries.

CREATE OR REPLACE FUNCTION fn_validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debit  NUMERIC;
  v_total_credit NUMERIC;
  v_diff         NUMERIC;
BEGIN
  IF NEW.status = 'posted' THEN
    SELECT
      COALESCE(SUM("debit"), 0),
      COALESCE(SUM("credit"), 0)
    INTO v_total_debit, v_total_credit
    FROM public."JournalEntryLine"
    WHERE "entryId" = NEW.id;

    v_diff := ABS(v_total_debit - v_total_credit);

    IF v_diff > 0.005 THEN  -- allow tiny floating-point variance
      RAISE EXCEPTION 'Cannot post JournalEntry %: debits (%) ≠ credits (%). Difference: %',
        NEW.id, v_total_debit, v_total_credit, v_diff;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_balance_check
  BEFORE UPDATE ON public."JournalEntry"
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_journal_balance();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. ROOM RATE POSTING → AUTO FOLIO TRANSACTION
-- ═══════════════════════════════════════════════════════════════════════════════
-- When a RoomRatePosting is created (status=posted), auto-create a FolioTransaction
-- so the room charge appears on the guest's bill.

CREATE OR REPLACE FUNCTION fn_room_rate_to_folio_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_number TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'posted' THEN
    -- Get room number for description
    SELECT number INTO v_room_number FROM public."Room" WHERE id = NEW."roomId";

    INSERT INTO public."FolioTransaction" (
      "id", "folioId", "transactionType", "description",
      "amount", "taxAmount", "totalAmount", "quantity", "reference", "createdAt"
    )
    VALUES (
      gen_random_uuid()::text,
      NEW."folioId",
      'room',
      format('Room Rate — Room %s (%s)', COALESCE(v_room_number, NEW."roomId"),
             to_char(NEW."postingDate", 'Mon DD, YYYY')),
      NEW."roomRate",
      NEW."taxAmount",
      NEW."totalAmount",
      1,
      format('RRP-%s', NEW.id),
      NEW."createdAt"
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_room_rate_posting_folio
  AFTER INSERT ON public."RoomRatePosting"
  FOR EACH ROW
  EXECUTE FUNCTION fn_room_rate_to_folio_transaction();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. SECURITY EVENT ON FAILED LOGIN ATTEMPTS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Auto-log SecurityEvent when a session_invalidated event occurs.
-- (Complements the application-level logging in auth-helpers.ts)


-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. AUTO-CLOSE FOLIO ON CHECK-OUT
-- ═══════════════════════════════════════════════════════════════════════════════
-- When a reservation is checked out, auto-close all open folios for that reservation.

CREATE OR REPLACE FUNCTION fn_auto_close_folio_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE public."Folio"
    SET status = 'closed',
        "updatedAt" = NOW()
    WHERE "reservationId" = NEW.id
      AND status = 'open';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_close_folio
  AFTER UPDATE ON public."Reservation"
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_close_folio_on_checkout();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. NIGHT AUDIT COMPLETION — Close open cashier shifts
-- ═══════════════════════════════════════════════════════════════════════════════
-- When a NightAudit is marked completed, auto-close any open cashier shifts.

CREATE OR REPLACE FUNCTION fn_night_audit_close_shifts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public."CashierShift"
    SET status = 'closed',
        "endDate" = NEW."completedAt"
    WHERE status = 'open';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_night_audit_close_shifts
  AFTER UPDATE ON public."NightAudit"
  FOR EACH ROW
  EXECUTE FUNCTION fn_night_audit_close_shifts();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. HOUSEKEEPING TASK → ROOM STATUS SYNC
-- ═══════════════════════════════════════════════════════════════════════════════
-- When an HK task is marked "cleaned" → room becomes "inspected" (pending inspection)
-- When an HK task is marked "inspected" → room becomes "vacant_clean"

CREATE OR REPLACE FUNCTION fn_hk_task_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."roomId" IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'cleaned' THEN
        UPDATE public."Room" SET status = 'inspected' WHERE id = NEW."roomId" AND status IN ('cleaning', 'vacant_dirty');
      WHEN 'inspected' THEN
        UPDATE public."Room" SET status = 'vacant_clean' WHERE id = NEW."roomId" AND status = 'inspected';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hk_task_room_status
  AFTER UPDATE ON public."HkTask"
  FOR EACH ROW
  EXECUTE FUNCTION fn_hk_task_room_status();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. PREVENT DUPLICATE ROOM ASSIGNMENTS (Overbooking Guard)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Before a reservation is checked in, verify no other active reservation
-- occupies the same room with overlapping dates.

CREATE OR REPLACE FUNCTION fn_prevent_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflict INTEGER;
BEGIN
  -- Only check on check-in with a room assigned
  IF NEW.status = 'checked_in' AND NEW."roomId" IS NOT NULL THEN
    SELECT COUNT(*) INTO v_conflict
    FROM public."Reservation"
    WHERE "roomId" = NEW."roomId"
      AND id != NEW.id
      AND status IN ('confirmed', 'checked_in', 'tentative')
      AND "checkIn" < NEW."checkOut"
      AND "checkOut" > NEW."checkIn";

    IF v_conflict > 0 THEN
      RAISE EXCEPTION 'Double booking detected! Room is already assigned to another active reservation overlapping these dates.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_double_booking
  BEFORE UPDATE ON public."Reservation"
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_double_booking();


-- =============================================================================
-- DONE — 15 triggers created
-- =============================================================================
-- Summary:
--   #1  trg_reservation_room_status    — Reservation status → Room status + auto HK task
--   #2  trg_folio_trans_balance         — FolioTransaction → recalculate Folio.balance
--   #3  trg_folio_payment_balance        — FolioPayment → recalculate Folio.balance
--   #4  trg_reservation_status_log       — Reservation status change → ActivityLog
--   #5  trg_guest_stats_checkout         — Check-out → Guest totalStays/revenue/loyalty
--   #6  trg_pos_order_total             — OrderItem change → PosOrder.totalAmount
--   #7  trg_inventory_low_stock         — Stock ≤ reorderPoint → SecurityEvent alert
--   #8  trg_payment_sync_reservation     — FolioPayment → Reservation.paidAmount
--   #9  trg_work_order_room             — Emergency work order → Room out_of_order
--   #10 trg_journal_balance_check        — JournalEntry posting → debit/credit validation
--   #11 (handled in app-level auth-helpers.ts)
--   #12 trg_auto_close_folio            — Check-out → close open folios
--   #13 trg_night_audit_close_shifts     — NightAudit completed → close cashier shifts
--   #14 trg_hk_task_room_status         — HK task cleaned/inspected → Room status
--   #15 trg_prevent_double_booking       — Check-in → overbooking prevention
-- =============================================================================
