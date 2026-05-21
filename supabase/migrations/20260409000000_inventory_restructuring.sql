-- Migration: Inventory Restructuring based on PRD
-- Date: 2026-04-09

-- 1. Unit of Measurement (UoM)
CREATE TABLE public.inventory_uoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_uom_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_uom_id UUID NOT NULL REFERENCES public.inventory_uoms(id) ON DELETE CASCADE,
  to_uom_id UUID NOT NULL REFERENCES public.inventory_uoms(id) ON DELETE CASCADE,
  conversion_factor NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_uom_id, to_uom_id)
);

-- 2. Stores / Warehouses
CREATE TABLE public.inventory_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  store_manager_id UUID REFERENCES public.staff_members(id),
  store_type TEXT NOT NULL DEFAULT 'general', -- 'main', 'kitchen', 'bar', 'housekeeping', 'engineering'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Item-Store Stock Levels (Multi-store support)
CREATE TABLE public.inventory_item_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.inventory_stores(id) ON DELETE CASCADE,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  max_stock NUMERIC,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  location_within_store TEXT,
  UNIQUE(item_id, store_id)
);

-- 4. Requisitions
CREATE TABLE public.inventory_requisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(user_id),
  required_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'partially_ordered', 'fully_ordered'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_requisition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID NOT NULL REFERENCES public.inventory_requisitions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL,
  notes TEXT
);

-- 5. Recipes / BOM
CREATE TABLE public.inventory_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  menu_item_id UUID, -- Optional link to a POS menu item
  description TEXT,
  portion_size TEXT,
  yield_percentage NUMERIC DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.inventory_recipes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL,
  uom_id UUID REFERENCES public.inventory_uoms(id),
  waste_percentage NUMERIC DEFAULT 0
);

-- 6. Stock Counts (Audits)
CREATE TABLE public.inventory_stock_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_number TEXT NOT NULL UNIQUE,
  store_id UUID REFERENCES public.inventory_stores(id),
  counted_by UUID REFERENCES public.profiles(user_id),
  count_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'reconciled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_stock_count_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_count_id UUID NOT NULL REFERENCES public.inventory_stock_counts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  system_quantity NUMERIC NOT NULL,
  counted_quantity NUMERIC NOT NULL,
  variance NUMERIC GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  notes TEXT
);

-- 7. Add fields to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'consumable',
ADD COLUMN IF NOT EXISTS shelf_life TEXT,
ADD COLUMN IF NOT EXISTS storage_instructions TEXT,
ADD COLUMN IF NOT EXISTS avg_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchase_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_applicability JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS uom_id UUID REFERENCES public.inventory_uoms(id);

-- 8. Add fields to stock_movements
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.inventory_stores(id),
ADD COLUMN IF NOT EXISTS requisition_id UUID REFERENCES public.inventory_requisitions(id);

-- 9. Enable RLS
ALTER TABLE public.inventory_uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_uom_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_item_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_count_items ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
CREATE POLICY "Staff can manage inventory_uoms" ON public.inventory_uoms FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_uom_conversions" ON public.inventory_uom_conversions FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_stores" ON public.inventory_stores FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_item_stores" ON public.inventory_item_stores FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_requisitions" ON public.inventory_requisitions FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_requisition_items" ON public.inventory_requisition_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_recipes" ON public.inventory_recipes FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_recipe_items" ON public.inventory_recipe_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_stock_counts" ON public.inventory_stock_counts FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_stock_count_items" ON public.inventory_stock_count_items FOR ALL USING (is_staff(auth.uid()));

-- 11. Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock_counts;

-- 12. Triggers for updated_at
CREATE TRIGGER update_inventory_stores_updated_at BEFORE UPDATE ON public.inventory_stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_requisitions_updated_at BEFORE UPDATE ON public.inventory_requisitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_recipes_updated_at BEFORE UPDATE ON public.inventory_recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Default UoMs
INSERT INTO public.inventory_uoms (name, abbreviation) VALUES
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Liter', 'L'),
  ('Milliliter', 'ml'),
  ('Piece', 'pcs'),
  ('Bottle', 'btl'),
  ('Packet', 'pkt'),
  ('Carton', 'ctn'),
  ('Box', 'box'),
  ('Tray', 'tray'),
  ('Dozen', 'dz');
