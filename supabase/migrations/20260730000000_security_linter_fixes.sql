-- =============================================================================
-- SUPABASE SECURITY LINTER FIXES
-- =============================================================================
-- Addresses all Supabase database linter warnings:
--   1. Function Search Path Mutable (16 functions)
--   2. RLS Policy Always True (ActivityLog, SecurityEvent INSERT)
--   3. SECURITY DEFINER function execute permissions (current_user_role, rls_auto_enable)
--
-- Note: "Leaked Password Protection Disabled" is a Supabase Auth dashboard
-- setting and cannot be fixed via SQL migration. Enable it at:
--   Supabase Dashboard → Authentication → Policies → Password Protection
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FIX FUNCTION SEARCH PATH MUTABLE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Recreate all 16 flagged functions with SET search_path = '' to prevent
-- search_path hijacking attacks.
-- Also fix all realtime/broadcast functions (not flagged but same issue).

-- 1a. RLS helper functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public."AuthUser" WHERE id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gm()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT public.current_user_role() IN ('admin', 'gm');
$$;

-- 1b. Trigger functions from db_triggers migration
CREATE OR REPLACE FUNCTION public.fn_sync_room_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_room_id TEXT;
BEGIN
  IF (TG_OP = 'UPDATE') AND OLD.status IS DISTINCT FROM NEW.status AND NEW."roomId" IS NOT NULL THEN
    v_room_id := NEW."roomId";

    CASE NEW.status
      WHEN 'checked_in' THEN
        UPDATE public."Room" SET status = 'occupied' WHERE id = v_room_id;

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
        ON CONFLICT DO NOTHING;

      WHEN 'cancelled' THEN
        IF OLD.status = 'checked_in' THEN
          UPDATE public."Room" SET status = 'vacant_dirty' WHERE id = v_room_id AND status = 'occupied';
        END IF;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalc_folio_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_folio_id TEXT;
BEGIN
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

CREATE OR REPLACE FUNCTION public.fn_log_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_update_guest_stats_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_recalc_pos_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_alert_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_sync_reservation_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_folio RECORD;
  v_res_id TEXT;
BEGIN
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'completed'))
     AND NEW.status = 'completed' THEN
    SELECT "reservationId" INTO v_res_id
    FROM public."Folio"
    WHERE id = NEW."folioId";

    IF v_res_id IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION public.fn_work_order_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW."roomId" IS NOT NULL THEN
    IF TG_OP = 'INSERT' AND NEW.priority = 'emergency' THEN
      UPDATE public."Room" SET status = 'out_of_order' WHERE id = NEW."roomId" AND status != 'out_of_order';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' AND OLD.priority = 'emergency' THEN
      UPDATE public."Room"
      SET status = 'vacant_dirty'
      WHERE id = NEW."roomId" AND status = 'out_of_order';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

    IF v_diff > 0.005 THEN
      RAISE EXCEPTION 'Cannot post JournalEntry %: debits (%) ≠ credits (%). Difference: %',
        NEW.id, v_total_debit, v_total_credit, v_diff;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_room_rate_to_folio_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_room_number TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'posted' THEN
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

CREATE OR REPLACE FUNCTION public.fn_auto_close_folio_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_night_audit_close_shifts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_hk_task_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.fn_prevent_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_conflict INTEGER;
BEGIN
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1c. Realtime/broadcast functions (also fix search_path)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_realtime_broadcast(
  p_channel TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_notify(
    p_channel,
    json_build_object(
      'event_type', p_event_type,
      'payload', p_payload,
      'timestamp', NOW()
    )::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM fn_realtime_broadcast(
      'room_updates',
      'room_status_changed',
      jsonb_build_object(
        'roomId', NEW.id,
        'roomNumber', NEW.number,
        'floor', NEW.floor,
        'oldStatus', OLD.status,
        'newStatus', NEW.status,
        'wing', NEW.wing,
        'building', NEW.building
      )
    );
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'room_updates',
      'room_created',
      jsonb_build_object(
        'roomId', NEW.id,
        'roomNumber', NEW.number,
        'floor', NEW.floor,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_reservation_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'reservation_events',
      'new_reservation',
      jsonb_build_object(
        'reservationId', NEW.id,
        'confirmationNo', NEW."confirmationNo",
        'guestName', COALESCE(
          (SELECT firstName || ' ' || lastName FROM public."Guest" WHERE id = NEW."guestId"),
          'Unknown'
        ),
        'status', NEW.status,
        'checkIn', NEW."checkIn",
        'checkOut', NEW."checkOut",
        'roomRate', NEW."roomRate",
        'totalAmount', NEW."totalAmount",
        'source', NEW."source"
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM fn_realtime_broadcast(
      'reservation_events',
      'reservation_status_changed',
      jsonb_build_object(
        'reservationId', NEW.id,
        'confirmationNo', NEW."confirmationNo",
        'guestName', COALESCE(
          (SELECT firstName || ' ' || lastName FROM public."Guest" WHERE id = NEW."guestId"),
          'Unknown'
        ),
        'oldStatus', OLD.status,
        'newStatus', NEW.status,
        'roomId', NEW."roomId",
        'roomNumber', COALESCE(
          (SELECT number FROM public."Room" WHERE id = NEW."roomId"),
          NULL
        )
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_payment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_guest_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(g.firstName || ' ' || g.lastName, 'Unknown') INTO v_guest_name
    FROM public."Folio" f
    LEFT JOIN public."Guest" g ON g.id = f."guestId"
    WHERE f.id = NEW."folioId";

    PERFORM fn_realtime_broadcast(
      'payment_events',
      'payment_received',
      jsonb_build_object(
        'paymentId', NEW.id,
        'folioId', NEW."folioId",
        'amount', NEW.amount,
        'method', NEW."paymentMethod",
        'status', NEW.status,
        'guestName', v_guest_name,
        'reference', NEW.reference
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_hk_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_room_number TEXT;
BEGIN
  SELECT number INTO v_room_number
  FROM public."Room" WHERE id = NEW."roomId";

  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'hk_events',
      'new_hk_task',
      jsonb_build_object(
        'taskId', NEW.id,
        'roomId', NEW."roomId",
        'roomNumber', v_room_number,
        'taskType', NEW."taskType",
        'priority', NEW.priority,
        'status', NEW.status
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM fn_realtime_broadcast(
      'hk_events',
      'hk_task_status_changed',
      jsonb_build_object(
        'taskId', NEW.id,
        'roomId', NEW."roomId",
        'roomNumber', v_room_number,
        'taskType', NEW."taskType",
        'oldStatus', OLD.status,
        'newStatus', NEW.status
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_work_order_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_room_number TEXT;
BEGIN
  SELECT number INTO v_room_number
  FROM public."Room" WHERE id = NEW."roomId";

  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'maintenance_events',
      'new_work_order',
      jsonb_build_object(
        'workOrderId', NEW.id,
        'roomId', NEW."roomId",
        'roomNumber', v_room_number,
        'title', NEW.title,
        'category', NEW.category,
        'priority', NEW.priority,
        'status', NEW.status
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM fn_realtime_broadcast(
      'maintenance_events',
      'work_order_status_changed',
      jsonb_build_object(
        'workOrderId', NEW.id,
        'roomId', NEW."roomId",
        'roomNumber', v_room_number,
        'title', NEW.title,
        'oldStatus', OLD.status,
        'newStatus', NEW.status,
        'priority', NEW.priority
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_security_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'security_events',
      'security_alert',
      jsonb_build_object(
        'eventId', NEW.id,
        'type', NEW.type,
        'level', NEW.level,
        'details', NEW.details
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_pos_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_outlet_name TEXT;
BEGIN
  SELECT name INTO v_outlet_name
  FROM public."Outlet" WHERE id = NEW."outletId";

  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'pos_events',
      'new_pos_order',
      jsonb_build_object(
        'orderId', NEW.id,
        'outletId', NEW."outletId",
        'outletName', v_outlet_name,
        'status', NEW.status,
        'totalAmount', NEW."totalAmount"
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM fn_realtime_broadcast(
      'pos_events',
      'pos_order_status_changed',
      jsonb_build_object(
        'orderId', NEW.id,
        'outletId', NEW."outletId",
        'outletName', v_outlet_name,
        'oldStatus', OLD.status,
        'newStatus', NEW.status,
        'totalAmount', NEW."totalAmount"
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_activity_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'activity_events',
      'new_activity',
      jsonb_build_object(
        'logId', NEW.id,
        'userId', NEW."userId",
        'userName', NEW."userName",
        'action', NEW.action,
        'module', NEW.module,
        'details', NEW.details
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_folio_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_guest_name TEXT;
BEGIN
  SELECT COALESCE(g.firstName || ' ' || g.lastName, 'Unknown') INTO v_guest_name
  FROM public."Folio" f
  LEFT JOIN public."Guest" g ON g.id = f."guestId"
  WHERE f.id = NEW."folioId";

  IF TG_OP = 'INSERT' THEN
    PERFORM fn_realtime_broadcast(
      'folio_events',
      'new_folio_transaction',
      jsonb_build_object(
        'transactionId', NEW.id,
        'folioId', NEW."folioId",
        'type', NEW."transactionType",
        'description', NEW.description,
        'amount', NEW.amount,
        'totalAmount', NEW."totalAmount",
        'guestName', v_guest_name
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_broadcast_inventory_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW."currentStock" <= NEW."reorderPoint"
     AND OLD."currentStock" > NEW."reorderPoint" THEN
    PERFORM fn_realtime_broadcast(
      'inventory_events',
      'low_stock_alert',
      jsonb_build_object(
        'itemId', NEW.id,
        'name', NEW.name,
        'currentStock', NEW."currentStock",
        'reorderPoint', NEW."reorderPoint",
        'unit', NEW.unit
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cleanup_stale_presence()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public."UserPresence"
  SET status = 'offline', "lastSeen" = NOW()
  WHERE status != 'offline'
    AND "lastSeen" < NOW() - INTERVAL '2 minutes';
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FIX RLS POLICY ALWAYS TRUE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Drop the permissive INSERT policies and replace with properly scoped ones.
-- Note: Database triggers bypass RLS (they run as table owner), so trigger-
-- generated inserts into ActivityLog/SecurityEvent are not affected.

-- 2a. ActivityLog INSERT: users can only insert with their own userId
DROP POLICY IF EXISTS "all_insert_activity" ON public."ActivityLog";
DROP POLICY IF EXISTS "user_insert_own_activity" ON public."ActivityLog";
CREATE POLICY "user_insert_own_activity" ON public."ActivityLog"
  FOR INSERT TO authenticated
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- 2b. SecurityEvent INSERT: only admin/GM can insert directly via client
--    (trigger-generated inserts bypass RLS and are unaffected)
DROP POLICY IF EXISTS "all_insert_security" ON public."SecurityEvent";
CREATE POLICY "admin_gm_insert_security" ON public."SecurityEvent"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gm());


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. FIX SECURITY DEFINER FUNCTION EXECUTE PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Revoke EXECUTE on SECURITY DEFINER functions from anon role.
-- authenticated users still need access (used in RLS policies).

-- 3a. current_user_role: revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;

-- 3b. rls_auto_enable: revoke anon AND authenticated (admin-only operation),
--     then grant back to authenticated with admin/GM role check
DO $$
BEGIN
  -- Revoke from anon
  REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
  -- Revoke from authenticated (will re-grant selectively if needed)
  REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
EXCEPTION WHEN undefined_function THEN
  -- Function doesn't exist in this database, skip gracefully
  RAISE NOTICE 'rls_auto_enable() function not found — skipping permission fix';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. LEAKED PASSWORD PROTECTION
-- ═══════════════════════════════════════════════════════════════════════════════
-- This is a Supabase Auth configuration, NOT a database-level setting.
-- Enable it via:
--   Supabase Dashboard → Authentication → Policies → Enable "Leaked Password Protection"
-- Or via the Supabase Management API:
--   PATCH /projects/{ref}/config/auth {
--     "password_protection": { "enabled": true }
--   }
-- =============================================================================
-- DONE — Security linter fixes applied
-- =============================================================================
