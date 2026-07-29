-- =============================================================================
-- SUPABASE REALTIME — Meridian Hotel PMS
-- =============================================================================
-- Enables Supabase Realtime postgres_changes on key tables so the frontend
-- can subscribe to live INSERT / UPDATE / DELETE events.
--
-- Also adds a pg_notify() helper function that the database triggers can call
-- to send custom broadcast messages through Supabase Realtime.
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ENABLE REALTIME PUBLICATION ON KEY TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- This enables the Supabase Realtime postgres_changes feature for these tables.
-- The frontend can subscribe to changes and receive them in real time via WebSocket.

ALTER PUBLICATION supabase_realtime ADD TABLE public."Room";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Reservation";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Guest";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Folio";
ALTER PUBLICATION supabase_realtime ADD TABLE public."FolioTransaction";
ALTER PUBLICATION supabase_realtime ADD TABLE public."FolioPayment";
ALTER PUBLICATION supabase_realtime ADD TABLE public."HkTask";
ALTER PUBLICATION supabase_realtime ADD TABLE public."WorkOrder";
ALTER PUBLICATION supabase_realtime ADD TABLE public."PosOrder";
ALTER PUBLICATION supabase_realtime ADD TABLE public."OrderItem";
ALTER PUBLICATION supabase_realtime ADD TABLE public."InventoryItem";
ALTER PUBLICATION supabase_realtime ADD TABLE public."SecurityEvent";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ActivityLog";
ALTER PUBLICATION supabase_realtime ADD TABLE public."RoomRatePosting";
ALTER PUBLICATION supabase_realtime ADD TABLE public."NightAudit";
ALTER PUBLICATION supabase_realtime ADD TABLE public."CashierShift";
ALTER PUBLICATION supabase_realtime ADD TABLE public."DailyRate";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Outlet";
ALTER PUBLICATION supabase_realtime ADD TABLE public."MenuItem";
ALTER PUBLICATION supabase_realtime ADD TABLE public."Employee";


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. REALTIME BROADCAST HELPER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════
-- pg_notify sends a payload through PostgreSQL's LISTEN/NOTIFY which Supabase
-- Realtime forwards to connected clients. We use a standardized payload format
-- so the frontend can categorize and render events properly.

CREATE OR REPLACE FUNCTION fn_realtime_broadcast(
  p_channel TEXT,     -- e.g. 'room_updates', 'reservation_events', 'notifications'
  p_event_type TEXT,  -- e.g. 'room_status_changed', 'new_reservation', 'payment_received'
  p_payload JSONB      -- arbitrary event data
)
RETURNS VOID
LANGUAGE plpgsql
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ENHANCED TRIGGERS — Add realtime broadcast to existing triggers
-- ═══════════════════════════════════════════════════════════════════════════════
-- These are SUPPLEMENTARY triggers that fire AFTER the main triggers.
-- They broadcast events via pg_notify so realtime subscribers get notified.

-- 3a. Room status change → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_room_status
  AFTER INSERT OR UPDATE ON public."Room"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_room_status();


-- 3b. Reservation events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_reservation_events()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_reservation_events
  AFTER INSERT OR UPDATE ON public."Reservation"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_reservation_events();


-- 3c. Payment events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_payment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_guest_name TEXT;
  v_room_number TEXT;
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

CREATE TRIGGER trg_broadcast_payment_events
  AFTER INSERT OR UPDATE ON public."FolioPayment"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_payment_events();


-- 3d. Housekeeping task events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_hk_events()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_hk_events
  AFTER INSERT OR UPDATE ON public."HkTask"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_hk_events();


-- 3e. Work order events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_work_order_events()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_work_order_events
  AFTER INSERT OR UPDATE ON public."WorkOrder"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_work_order_events();


-- 3f. Security events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_security_events()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_security_events
  AFTER INSERT ON public."SecurityEvent"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_security_events();


-- 3g. POS order events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_pos_events()
RETURNS TRIGGER
LANGUAGE plpgsql
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
        'orderType', NEW."orderType",
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

CREATE TRIGGER trg_broadcast_pos_events
  AFTER INSERT OR UPDATE ON public."PosOrder"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_pos_events();


-- 3h. Activity log events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_activity_log()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_activity_log
  AFTER INSERT ON public."ActivityLog"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_activity_log();


-- 3i. Folio transaction events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_folio_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_folio_transaction
  AFTER INSERT OR UPDATE ON public."FolioTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_folio_transaction();


-- 3j. Inventory low stock events → broadcast
CREATE OR REPLACE FUNCTION fn_broadcast_inventory_events()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_broadcast_inventory_events
  AFTER UPDATE ON public."InventoryItem"
  FOR EACH ROW
  EXECUTE FUNCTION fn_broadcast_inventory_events();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. REALTIME PRESENCE TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Track online users via Supabase Presence. This table stores the last heartbeat
-- timestamp; the frontend sends periodic heartbeats and cleans up stale entries.

CREATE TABLE IF NOT EXISTS public."UserPresence" (
  "userId"       TEXT PRIMARY KEY REFERENCES public."AuthUser"(id) ON DELETE CASCADE,
  "userName"     TEXT NOT NULL,
  "role"         TEXT NOT NULL DEFAULT 'staff',
  "department"   TEXT DEFAULT 'Management',
  "status"       TEXT NOT NULL DEFAULT 'online',  -- online, away, busy, offline
  "currentModule" TEXT,
  "currentPath"  TEXT,
  "lastSeen"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "connectedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable realtime on the presence table too
ALTER PUBLICATION supabase_realtime ADD TABLE public."UserPresence";

-- Cleanup function: mark users offline if no heartbeat in 2 minutes
CREATE OR REPLACE FUNCTION fn_cleanup_stale_presence()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public."UserPresence"
  SET status = 'offline', "lastSeen" = NOW()
  WHERE status != 'offline'
    AND "lastSeen" < NOW() - INTERVAL '2 minutes';
END;
$$;


-- =============================================================================
-- DONE — Realtime migration complete
-- =============================================================================
-- Summary of changes:
--   1.  20 tables added to supabase_realtime publication
--   2.  fn_realtime_broadcast() helper for pg_notify events
--   3.  10 broadcast triggers (room, reservation, payment, HK, work order,
--       security, POS, activity, folio, inventory)
--   4.  UserPresence table for online status tracking
--   5.  Stale presence cleanup function
-- =============================================================================
