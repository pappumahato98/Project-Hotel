-- ============================================
-- POS SYSTEM TABLES
-- ============================================

-- POS Companies (for corporate billing)
CREATE TABLE IF NOT EXISTS public.pos_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  vat_number TEXT,
  pan_number TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Tables
CREATE TABLE IF NOT EXISTS public.pos_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'billing', 'held'
  guests INTEGER,
  server_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  merged_with TEXT[], -- Array of table numbers
  current_order JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Orders (Master record for a table session)
CREATE TABLE IF NOT EXISTS public.pos_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID REFERENCES public.pos_tables(id),
  table_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'billing', 'paid', 'cancelled', 'merged'
  guests INTEGER,
  server_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  subtotal NUMERIC,
  discount_amount NUMERIC,
  tax_amount NUMERIC,
  tip_amount NUMERIC,
  total NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Order Items
CREATE TABLE IF NOT EXISTS public.pos_order_items (
  id UUID NOT NULL PRIMARY KEY, -- Use UUID from app or generated
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'preparing', 'ready', 'served', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Transactions (Finalized bills)
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  table_number TEXT NOT NULL,
  customer_name TEXT,
  customer_address TEXT,
  company_id UUID REFERENCES public.pos_companies(id),
  company_name TEXT,
  vat_number TEXT,
  pan_number TEXT,
  subtotal NUMERIC NOT NULL,
  discount_amount NUMERIC,
  tax_amount NUMERIC NOT NULL,
  tip_amount NUMERIC,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  rrn_number TEXT,
  transaction_ref TEXT,
  card_last_four TEXT,
  card_type TEXT,
  room_number TEXT,
  items_count INTEGER NOT NULL,
  items JSONB NOT NULL, -- Snapshot of items at checkout
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage pos_companies" ON public.pos_companies FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage pos_tables" ON public.pos_tables FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage pos_orders" ON public.pos_orders FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage pos_order_items" ON public.pos_order_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage pos_transactions" ON public.pos_transactions FOR ALL USING (is_staff(auth.uid()));

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_order_items;

-- Update triggers
CREATE TRIGGER update_pos_companies_updated_at BEFORE UPDATE ON public.pos_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_tables_updated_at BEFORE UPDATE ON public.pos_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_orders_updated_at BEFORE UPDATE ON public.pos_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_order_items_updated_at BEFORE UPDATE ON public.pos_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial tables
INSERT INTO public.pos_tables (table_number, capacity) VALUES
  ('1', 2), ('2', 2), ('3', 4), ('4', 4), ('5', 4), ('6', 6),
  ('7', 6), ('8', 8), ('9', 4), ('10', 2), ('11', 4), ('12', 4)
ON CONFLICT (table_number) DO NOTHING;
