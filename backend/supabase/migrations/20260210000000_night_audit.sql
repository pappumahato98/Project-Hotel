-- ============================================
-- NIGHT AUDIT & DAY CLOSE SUBSYSTEM
-- ============================================

-- 1. Initialize Business Date in Settings
INSERT INTO public.settings (key, value)
VALUES ('business_date', '"2024-12-20"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Create Night Audit Logs
CREATE TABLE IF NOT EXISTS public.night_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_date DATE NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
  total_charges_posted NUMERIC DEFAULT 0,
  total_room_revenue NUMERIC DEFAULT 0,
  occupancy_rate NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create Day Close Logs
CREATE TABLE IF NOT EXISTS public.day_close_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_date DATE NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  total_revenue NUMERIC DEFAULT 0,
  dept_summaries JSONB, -- Breakdown by department
  status TEXT NOT NULL DEFAULT 'closed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.night_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_close_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Staff can manage night_audit_logs" ON public.night_audit_logs;
CREATE POLICY "Staff can manage night_audit_logs" ON public.night_audit_logs FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage day_close_logs" ON public.day_close_logs;
CREATE POLICY "Staff can manage day_close_logs" ON public.day_close_logs FOR ALL USING (public.is_staff(auth.uid()));

-- 6. Helper Function: Post Daily Room Charges
-- This would typically be called by the Night Audit process
CREATE OR REPLACE FUNCTION public.post_daily_room_charges(v_business_date DATE)
RETURNS TABLE (posted_count INTEGER, total_revenue NUMERIC) AS $$
DECLARE
    r RECORD;
    v_posted_count INTEGER := 0;
    v_total_revenue NUMERIC := 0;
BEGIN
    -- For each active check-in that hasn't checked out yet
    FOR r IN
        SELECT f.id as folio_id, r.total_amount, rm.price_per_night, rm.room_number
        FROM public.guest_folios f
        JOIN public.reservations r ON f.reservation_id = r.id
        JOIN public.rooms rm ON f.room_id = rm.id
        WHERE r.status = 'checked-in'
          AND f.status = 'open'
          AND r.check_in_date <= v_business_date
          AND r.check_out_date > v_business_date
    LOOP
        -- Insert charge into folio_items
        INSERT INTO public.folio_items (folio_id, item_type, source, description, amount)
        VALUES (r.folio_id, 'charge', 'room_rate', 'Daily Room Charge - Room ' || r.room_number || ' (' || v_business_date || ')', r.price_per_night);

        v_posted_count := v_posted_count + 1;
        v_total_revenue := v_total_revenue + r.price_per_night;
    END LOOP;

    RETURN QUERY SELECT v_posted_count, v_total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Publication (Realtime)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.night_audit_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.day_close_logs;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
