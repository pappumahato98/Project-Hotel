-- ============================================
-- GUEST FOLIOS SUBSYSTEM v4
-- Force schema cache refresh
-- ============================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.guest_folios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  folio_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  total_charges NUMERIC NOT NULL DEFAULT 0,
  total_payments NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.folio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  source TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_id TEXT,
  reason TEXT,
  modified_by TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  target_folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Ensure columns for existing tables (in case of partial migration)
DO $$
BEGIN
    ALTER TABLE public.folio_items ADD COLUMN IF NOT EXISTS reason TEXT;
    EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.folio_items ADD COLUMN IF NOT EXISTS modified_by TEXT;
    EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Enable RLS
ALTER TABLE public.guest_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Staff can manage guest_folios" ON public.guest_folios;
CREATE POLICY "Staff can manage guest_folios" ON public.guest_folios FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage folio_items" ON public.folio_items;
CREATE POLICY "Staff can manage folio_items" ON public.folio_items FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage routing_rules" ON public.routing_rules;
CREATE POLICY "Staff can manage routing_rules" ON public.routing_rules FOR ALL USING (public.is_staff(auth.uid()));

-- 5. Functions & Triggers
CREATE OR REPLACE FUNCTION public.update_folio_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_folio_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_folio_id := OLD.folio_id;
  ELSE
    v_folio_id := NEW.folio_id;
  END IF;

  UPDATE public.guest_folios
  SET
    total_charges = (SELECT COALESCE(SUM(amount), 0) FROM public.folio_items WHERE folio_id = v_folio_id AND item_type IN ('charge', 'adjustment') AND amount > 0),
    total_payments = (SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.folio_items WHERE folio_id = v_folio_id AND (item_type = 'payment' OR (item_type = 'adjustment' AND amount < 0))),
    balance = (SELECT COALESCE(SUM(amount), 0) FROM public.folio_items WHERE folio_id = v_folio_id),
    updated_at = now()
  WHERE id = v_folio_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_folio_totals ON public.folio_items;
CREATE TRIGGER tr_update_folio_totals
AFTER INSERT OR UPDATE OR DELETE ON public.folio_items
FOR EACH ROW EXECUTE FUNCTION public.update_folio_totals();

CREATE OR REPLACE FUNCTION public.generate_folio_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio_number IS NULL THEN
    NEW.folio_number := 'FOL-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_folio_number ON public.guest_folios;
CREATE TRIGGER tr_set_folio_number
BEFORE INSERT ON public.guest_folios
FOR EACH ROW EXECUTE FUNCTION public.generate_folio_number();

CREATE OR REPLACE FUNCTION public.auto_create_folio()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'checked-in' AND (OLD.status IS NULL OR OLD.status != 'checked-in')) THEN
    INSERT INTO public.guest_folios (reservation_id, room_id, guest_id)
    VALUES (NEW.id, NEW.room_id, NEW.guest_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_create_folio ON public.reservations;
CREATE TRIGGER tr_auto_create_folio
AFTER UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.auto_create_folio();

CREATE OR REPLACE FUNCTION public.sync_pos_to_folio()
RETURNS TRIGGER AS $$
DECLARE
  v_room_id UUID;
  v_folio_id UUID;
BEGIN
  IF NEW.room_number IS NOT NULL AND NEW.room_number != '' THEN
    SELECT r.id INTO v_room_id FROM public.rooms r WHERE r.room_number = NEW.room_number LIMIT 1;
    SELECT f.id INTO v_folio_id FROM public.guest_folios f WHERE f.room_id = v_room_id AND f.status = 'open' ORDER BY f.created_at DESC LIMIT 1;
    IF v_folio_id IS NOT NULL THEN
      INSERT INTO public.folio_items (folio_id, item_type, source, description, amount, reference_id)
      VALUES (v_folio_id, 'charge', 'pos', 'POS Transaction: ' || NEW.transaction_number, NEW.total, NEW.id::TEXT);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_pos_to_folio ON public.pos_transactions;
CREATE TRIGGER tr_sync_pos_to_folio
AFTER INSERT ON public.pos_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_pos_to_folio();

-- 6. Publication (Realtime) - Use DO block for safety
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_folios;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.folio_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.routing_rules;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
