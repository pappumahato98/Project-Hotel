-- Fix: fn_hk_task_room_status trigger missing ELSE clause
-- The CASE statement only handled 'cleaned' and 'inspected', causing
-- PostgreSQL error 20000 "case not found" for all other status values.

CREATE OR REPLACE FUNCTION fn_hk_task_room_status()
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
      ELSE
        NULL; -- other statuses don't change room status
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;