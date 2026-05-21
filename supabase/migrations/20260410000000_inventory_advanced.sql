-- Migration: Advanced Inventory Features (PRD Completion)
-- Date: 2026-04-10

-- 1. Unit Conversion Enhancements
ALTER TABLE public.inventory_uom_conversions
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Store/Warehouse Enhancements
ALTER TABLE public.inventory_stores
ADD COLUMN IF NOT EXISTS temperature_classification TEXT,
ADD COLUMN IF NOT EXISTS storage_conditions TEXT;

-- 3. Supplier Enhancements
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS supplier_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_details TEXT,
ADD COLUMN IF NOT EXISTS delivery_lead_time_days INTEGER;

-- 4. Purchase Order / GRN Enhancements
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS damaged_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending'; -- 'pending', 'passed', 'failed'

-- 5. Stock Issues (Requisition Fulfillment)
CREATE TABLE public.inventory_stock_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID REFERENCES public.inventory_requisitions(id),
  issue_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  issued_to UUID REFERENCES public.profiles(user_id),
  issued_by UUID REFERENCES public.profiles(user_id),
  status TEXT NOT NULL DEFAULT 'issued', -- 'issued', 'returned'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_stock_issue_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_issue_id UUID NOT NULL REFERENCES public.inventory_stock_issues(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL,
  batch_number TEXT,
  notes TEXT
);

-- 6. Inventory Accounting & Global Settings
CREATE TABLE public.inventory_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Default Settings
INSERT INTO public.inventory_settings (setting_key, setting_value, description) VALUES
  ('costing_method', 'weighted_average', 'Default inventory costing method: FIFO, LIFO, or weighted_average'),
  ('inventory_gl_account', '1200', 'General Ledger account for Inventory Asset'),
  ('consumption_gl_account', '5100', 'General Ledger account for Consumption Expense'),
  ('wastage_gl_account', '5200', 'General Ledger account for Wastage Expense'),
  ('purchase_gl_account', '5000', 'General Ledger account for Purchases');

-- 7. Production Logs (Batch Production)
CREATE TABLE public.inventory_production_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES public.inventory_recipes(id),
  quantity_produced NUMERIC NOT NULL,
  produced_by UUID REFERENCES public.profiles(user_id),
  production_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Enable RLS
ALTER TABLE public.inventory_stock_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_production_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
CREATE POLICY "Staff can manage inventory_stock_issues" ON public.inventory_stock_issues FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_stock_issue_items" ON public.inventory_stock_issue_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view inventory_settings" ON public.inventory_settings FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Admins can manage inventory_settings" ON public.inventory_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can manage inventory_production_logs" ON public.inventory_production_logs FOR ALL USING (is_staff(auth.uid()));

-- 10. Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_production_logs;
