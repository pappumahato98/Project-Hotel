-- ============================================
-- ENABLE REALTIME FOR ALL TABLES
-- ============================================

-- Drop and recreate the publication to ensure it's clean
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add all public tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_and_found;
ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_communications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tax_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_time_clock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_catering;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_venue_setups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_staff_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ota_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_change_audit;

-- ============================================
-- SETUP STORAGE BUCKETS
-- ============================================

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lost-found-images', 'lost-found-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage.objects
-- Use DO block to avoid errors if policies already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar images are publicly accessible') THEN
        CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
          FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar') THEN
        CREATE POLICY "Users can upload their own avatar" ON storage.objects
          FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar') THEN
        CREATE POLICY "Users can update their own avatar" ON storage.objects
          FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Property images are publicly accessible') THEN
        CREATE POLICY "Property images are publicly accessible" ON storage.objects
          FOR SELECT USING (bucket_id = 'property-images');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can upload property images') THEN
        CREATE POLICY "Staff can upload property images" ON storage.objects
          FOR INSERT WITH CHECK (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lost and found images are publicly accessible') THEN
        CREATE POLICY "Lost and found images are publicly accessible" ON storage.objects
          FOR SELECT USING (bucket_id = 'lost-found-images');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can upload lost and found images') THEN
        CREATE POLICY "Staff can upload lost and found images" ON storage.objects
          FOR INSERT WITH CHECK (bucket_id = 'lost-found-images' AND public.is_staff(auth.uid()));
    END IF;
END
$$;
