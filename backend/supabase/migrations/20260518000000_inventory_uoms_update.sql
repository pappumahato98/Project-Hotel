-- Migration: Update inventory_uoms with is_base column
-- Date: 2026-05-18

-- Add is_base column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_uoms' AND column_name = 'is_base'
  ) THEN
    ALTER TABLE public.inventory_uoms ADD COLUMN is_base BOOLEAN NOT NULL DEFAULT false;
  END IF;
END
$$;

-- Set first created UOM as base if none exists
UPDATE public.inventory_uoms 
SET is_base = true 
WHERE id = (SELECT id FROM public.inventory_uoms ORDER BY created_at ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM public.inventory_uoms WHERE is_base = true);