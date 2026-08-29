CREATE TABLE public.inventory_supplier_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  return_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  total_return_value NUMERIC DEFAULT 0,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_supplier_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.inventory_supplier_returns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL
);

ALTER TABLE public.inventory_supplier_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_supplier_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage inventory_supplier_returns" ON public.inventory_supplier_returns FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_supplier_return_items" ON public.inventory_supplier_return_items FOR ALL USING (is_staff(auth.uid()));
