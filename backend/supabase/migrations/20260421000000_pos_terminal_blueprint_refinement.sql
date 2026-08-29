-- Refinement for POS Terminal Blueprint
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS is_tax_exempt BOOLEAN DEFAULT false;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS total_covers INTEGER DEFAULT 1;

-- Link POS Menu Items to Inventory for 86-ing
CREATE TABLE IF NOT EXISTS public.pos_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    item_price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(item_id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMS Paging Log for Waitlist
CREATE TABLE IF NOT EXISTS public.pos_sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waitlist_id UUID REFERENCES public.pos_waitlist(id),
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'sent'
);
