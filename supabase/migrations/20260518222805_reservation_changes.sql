-- Reservation Changes Audit Table
-- Tracks room/date moves from drag-and-drop with full before/after values

CREATE TABLE public.reservation_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  old_room_id UUID REFERENCES public.rooms(id),
  new_room_id UUID REFERENCES public.rooms(id),
  old_check_in DATE,
  new_check_in DATE,
  old_check_out DATE,
  new_check_out DATE,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservation_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reservation changes"
  ON public.reservation_changes FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert reservation changes"
  ON public.reservation_changes FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

-- Seed common move reasons
CREATE TABLE public.reservation_change_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservation_change_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reservation change reasons"
  ON public.reservation_change_reasons FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage reservation change reasons"
  ON public.reservation_change_reasons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.reservation_change_reasons (label, sort_order) VALUES
  ('Room upgrade requested', 1),
  ('Room downgrade requested', 2),
  ('Maintenance issue', 3),
  ('Guest complaint', 4),
  ('Overbooking', 5),
  ('Room swap', 6),
  ('Early checkout by previous guest', 7),
  ('Late arrival - room not ready', 8),
  ('System error correction', 9),
  ('Other', 100);