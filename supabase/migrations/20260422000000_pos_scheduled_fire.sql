-- Support for scheduled fire logic in POS
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS fire_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS hold_flag BOOLEAN DEFAULT false;
