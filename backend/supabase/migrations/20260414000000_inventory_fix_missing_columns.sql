-- Migration: Fix missing columns in inventory_items
-- Date: 2026-04-14

-- 1. Add missing columns to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS safety_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS temperature_classification TEXT DEFAULT 'Ambient',
ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER DEFAULT 0;

-- 2. Rename sku to item_code for PRD alignment
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'sku') THEN
    ALTER TABLE public.inventory_items RENAME COLUMN sku TO item_code;
  END IF;
END \$\$;

-- 3. Rename unit_symbol/abbreviation columns to unit_symbol for consistency
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_uoms' AND column_name = 'abbreviation') THEN
    ALTER TABLE public.inventory_uoms RENAME COLUMN abbreviation TO unit_symbol;
  END IF;
END \$\$;

-- 4. Update existing inventory_uoms if needed (already inserted in 20260409)
-- No action needed here as insertion happened before, but just ensure names are correct if they were renamed

-- 5. Fix inventory_categories naming consistency
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_categories' AND column_name = 'name') THEN
    ALTER TABLE public.inventory_categories RENAME COLUMN name TO category_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_categories' AND column_name = 'parent_id') THEN
    ALTER TABLE public.inventory_categories RENAME COLUMN parent_id TO parent_category;
  END IF;
END \$\$;

-- 6. Fix inventory_stores naming consistency
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_stores' AND column_name = 'name') THEN
    ALTER TABLE public.inventory_stores RENAME COLUMN name TO store_name;
  END IF;
END \$\$;

-- 7. Add SKU Prefix to Categories
ALTER TABLE public.inventory_categories
ADD COLUMN IF NOT EXISTS sku_prefix TEXT;
