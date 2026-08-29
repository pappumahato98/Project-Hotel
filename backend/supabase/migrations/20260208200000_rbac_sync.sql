-- Finance Records Table
CREATE TABLE IF NOT EXISTS public.finance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL, -- 'income', 'expense'
    category TEXT NOT NULL, -- 'room_revenue', 'pos_revenue', 'ota_commission', 'maintenance', 'payroll'
    amount DECIMAL NOT NULL,
    description TEXT,
    reference_id UUID, -- References pos_transactions.id, payments.id, etc.
    metadata JSONB
);

-- Trigger to sync POS transactions to Finance
CREATE OR REPLACE FUNCTION public.sync_pos_to_finance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.finance_records (type, category, amount, description, reference_id, metadata)
    VALUES (
        'income',
        'pos_revenue',
        NEW.total,
        'POS Transaction #' || NEW.transaction_number || ' (Table ' || NEW.table_number || ')',
        NEW.id,
        jsonb_build_object('payment_method', NEW.payment_method, 'items_count', NEW.items_count)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_pos_transaction_to_finance
AFTER INSERT ON public.pos_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_pos_to_finance();

-- OTA Sync Log Table
CREATE TABLE IF NOT EXISTS public.ota_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ota_name TEXT NOT NULL, -- 'Booking.com', 'Expedia', 'Airbnb'
    status TEXT NOT NULL, -- 'success', 'failed'
    direction TEXT NOT NULL, -- 'push', 'pull'
    message TEXT,
    payload JSONB
);

-- RBAC Role-Permission Table (Extended)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    permission TEXT NOT NULL, -- 'manage_rooms', 'view_finance', 'manage_pos', etc.
    UNIQUE(role, permission)
);

-- Seed basic permissions
INSERT INTO public.role_permissions (role, permission) VALUES
('admin', 'all'),
('manager', 'manage_front_desk'),
('manager', 'view_finance'),
('manager', 'manage_pos'),
('manager', 'manage_inventory'),
('staff', 'manage_front_desk'),
('staff', 'manage_pos')
ON CONFLICT DO NOTHING;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ota_sync_logs;
