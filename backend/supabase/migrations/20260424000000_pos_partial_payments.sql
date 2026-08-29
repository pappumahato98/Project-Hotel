-- Support for partial payments and multi-split in POS
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS balance_remaining DECIMAL(10,2);
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0;

-- Trigger to initialize balance_remaining on order creation
CREATE OR REPLACE FUNCTION public.initialize_pos_order_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total IS NOT NULL THEN
    NEW.balance_remaining := NEW.total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_initialize_pos_order_balance
BEFORE INSERT ON public.pos_orders
FOR EACH ROW EXECUTE FUNCTION public.initialize_pos_order_balance();
