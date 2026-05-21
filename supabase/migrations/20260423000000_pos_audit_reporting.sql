-- Support for Audit & Reporting in POS
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id);

-- Track shift starts/ends for Cashier Report
CREATE TABLE IF NOT EXISTS public.pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES auth.users(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(10,2) DEFAULT 0,
    closing_balance DECIMAL(10,2) DEFAULT 0,
    actual_cash DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);
