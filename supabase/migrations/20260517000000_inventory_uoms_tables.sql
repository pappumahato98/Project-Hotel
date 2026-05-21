-- Migration: Create inventory UOM tables if missing
-- Date: 2026-05-17

-- Check and create inventory_uoms table
CREATE TABLE IF NOT EXISTS public.inventory_uoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  is_base BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Check and create inventory_uom_conversions table
CREATE TABLE IF NOT EXISTS public.inventory_uom_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_uom_id UUID NOT NULL REFERENCES public.inventory_uoms(id) ON DELETE CASCADE,
  to_uom_id UUID NOT NULL REFERENCES public.inventory_uoms(id) ON DELETE CASCADE,
  conversion_factor NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_uom_id, to_uom_id)
);

-- Enable RLS
ALTER TABLE public.inventory_uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_uom_conversions ENABLE ROW LEVEL SECURITY;

-- Create policies if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Staff can manage inventory_uoms') THEN
    CREATE POLICY "Staff can manage inventory_uoms" ON public.inventory_uoms FOR ALL USING (is_staff(auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Staff can manage inventory_uom_conversions') THEN
    CREATE POLICY "Staff can manage inventory_uom_conversions" ON public.inventory_uom_conversions FOR ALL USING (is_staff(auth.uid()));
  END IF;
END
$$;

-- Insert default UOMs if not exists
INSERT INTO public.inventory_uoms (name, abbreviation) 
SELECT * FROM (VALUES 
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Milligram', 'mg'),
  ('Liter', 'L'),
  ('Milliliter', 'ml'),
  ('Piece', 'pc'),
  ('Dozen', 'dz'),
  ('Pack', 'pk'),
  ('Box', 'bx'),
  ('Pound', 'lb'),
  ('Ounce', 'oz'),
  ('Gallon', 'gal'),
  ('Cup', 'cup'),
  ('Teaspoon', 'tsp'),
  ('Tablespoon', 'tbsp'),
  ('Meter', 'm'),
  ('Centimeter', 'cm'),
  ('Millimeter', 'mm'),
  ('Foot', 'ft'),
  ('Inch', 'in')
) AS v(name, abbreviation)
ON CONFLICT (name) DO NOTHING;