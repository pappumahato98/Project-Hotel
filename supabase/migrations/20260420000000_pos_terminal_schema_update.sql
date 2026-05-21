-- Update guests table with POS-relevant metadata
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS vip_tier TEXT DEFAULT 'Standard';

-- Update reservations table with meal plan info
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS meal_plan TEXT DEFAULT 'Room Only' CHECK (meal_plan IN ('Room Only', 'Bed and Breakfast', 'Half Board', 'Full Board', 'All Inclusive'));

-- Update pos_transactions with digital signature support
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Update pos_orders for PMS integration
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.guests(id);
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.reservations(id);

-- Update pos_order_items for Terminal features
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS seat_number INTEGER DEFAULT 1;

-- Create POS Waitlist table for digital queue management
CREATE TABLE IF NOT EXISTS public.pos_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  is_resident BOOLEAN DEFAULT false,
  room_number TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'seated', 'cancelled')),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on Waitlist
ALTER TABLE public.pos_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Waitlist
CREATE POLICY "Staff can manage pos_waitlist" ON public.pos_waitlist FOR ALL USING (is_staff(auth.uid()));

-- Enable Realtime for Waitlist
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_waitlist;

-- Trigger for Waitlist timestamp updates
CREATE TRIGGER update_pos_waitlist_updated_at BEFORE UPDATE ON public.pos_waitlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
