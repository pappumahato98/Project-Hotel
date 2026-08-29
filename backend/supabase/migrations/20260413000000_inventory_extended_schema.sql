-- Migration: Extended Inventory Schema for PRD alignment
-- Date: 2026-04-13

-- 1. Supplier Contracts & Pricing
CREATE TABLE public.inventory_supplier_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  terms TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'terminated'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.inventory_supplier_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.inventory_supplier_contracts(id) ON DELETE SET NULL,
  unit_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  is_preferred BOOLEAN DEFAULT false,
  valid_from DATE,
  valid_to DATE,
  UNIQUE(supplier_id, item_id)
);

-- 2. Formal Goods Receipt Header/Items (Separated from PO)
CREATE TABLE public.inventory_goods_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_number TEXT NOT NULL UNIQUE,
  po_id UUID REFERENCES public.purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  store_id UUID REFERENCES public.inventory_stores(id),
  received_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_by UUID REFERENCES public.profiles(user_id),
  invoice_number TEXT,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  notes TEXT
);

CREATE TABLE public.inventory_goods_receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_id UUID NOT NULL REFERENCES public.inventory_goods_receipts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  ordered_quantity NUMERIC,
  received_quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  batch_number TEXT,
  expiry_date DATE,
  quality_status TEXT DEFAULT 'passed', -- 'passed', 'failed', 'rejected'
  damaged_quantity NUMERIC DEFAULT 0
);

-- 3. Stock Transfers Header/Items
CREATE TABLE public.inventory_stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_number TEXT NOT NULL UNIQUE,
  from_store_id UUID NOT NULL REFERENCES public.inventory_stores(id),
  to_store_id UUID NOT NULL REFERENCES public.inventory_stores(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'in_transit', 'completed', 'cancelled'
  transferred_by UUID REFERENCES public.profiles(user_id),
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

CREATE TABLE public.inventory_stock_transfer_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.inventory_stock_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL
);

-- 4. Stock Adjustments Header/Items
CREATE TABLE public.inventory_stock_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_number TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.inventory_stores(id),
  adjustment_type TEXT NOT NULL, -- 'damage', 'expiry', 'theft', 'reconciliation'
  reason TEXT,
  approved_by UUID REFERENCES public.profiles(user_id),
  adjustment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'approved'
);

CREATE TABLE public.inventory_stock_adjustment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_id UUID NOT NULL REFERENCES public.inventory_stock_adjustments(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity_change NUMERIC NOT NULL -- Positive for gain, negative for loss
);

-- 5. Inventory Logs (Action Tracking)
CREATE TABLE public.inventory_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- 'create_item', 'update_stock', 'delete_requisition'
  module TEXT NOT NULL, -- 'items', 'grn', 'transfers'
  user_id UUID REFERENCES public.profiles(user_id),
  details JSONB,
  ip_address TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE public.inventory_supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_supplier_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Staff can manage supplier contracts" ON public.inventory_supplier_contracts FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage supplier pricing" ON public.inventory_supplier_pricing FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage goods receipts" ON public.inventory_goods_receipts FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage grn items" ON public.inventory_goods_receipt_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage stock transfers" ON public.inventory_stock_transfers FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage transfer items" ON public.inventory_stock_transfer_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage stock adjustments" ON public.inventory_stock_adjustments FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage adjustment items" ON public.inventory_stock_adjustment_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view logs" ON public.inventory_logs FOR SELECT USING (is_staff(auth.uid()));

-- 8. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_goods_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock_adjustments;
