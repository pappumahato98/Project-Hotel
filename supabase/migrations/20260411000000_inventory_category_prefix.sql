ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS sku_prefix TEXT;
ALTER TABLE public.inventory_transfers ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(user_id);
ALTER TABLE public.inventory_transfers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
