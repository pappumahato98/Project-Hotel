-- ============================================
-- FRONT DESK ENHANCEMENTS
-- ============================================

-- 1. Front Desk Queue (Guests waiting for rooms)
CREATE TABLE IF NOT EXISTS public.front_desk_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  requested_room_type TEXT,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'notified', 'checked_in', 'cancelled'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'vip', 'urgent'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Guest Messages (Internal communication for guests)
CREATE TABLE IF NOT EXISTS public.guest_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered', -- 'delivered', 'read', 'archived'
  message_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'emergency', 'package'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.front_desk_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Staff can manage front_desk_queue" ON public.front_desk_queue;
CREATE POLICY "Staff can manage front_desk_queue" ON public.front_desk_queue FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage guest_messages" ON public.guest_messages;
CREATE POLICY "Staff can manage guest_messages" ON public.guest_messages FOR ALL USING (public.is_staff(auth.uid()));

-- 5. Realtime Publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.front_desk_queue;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_messages;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
