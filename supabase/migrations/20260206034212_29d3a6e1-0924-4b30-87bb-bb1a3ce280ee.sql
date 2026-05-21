-- ============================================
-- COMPREHENSIVE HOSPITALITY ERP TABLES
-- ============================================

-- 1. INVENTORY MANAGEMENT
-- ============================================

-- Inventory Categories
CREATE TABLE public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.inventory_categories(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory Items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id UUID REFERENCES public.inventory_categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  unit TEXT NOT NULL DEFAULT 'pieces',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  max_stock NUMERIC,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC,
  location TEXT,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  received_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Order Items
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock Movements (for tracking inventory changes)
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
  quantity NUMERIC NOT NULL,
  reference_type TEXT, -- 'purchase_order', 'pos_sale', 'adjustment', 'transfer'
  reference_id UUID,
  from_location TEXT,
  to_location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. HOUSEKEEPING ENHANCEMENTS
-- ============================================

-- Housekeeping Tasks
CREATE TABLE public.housekeeping_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id),
  task_type TEXT NOT NULL, -- 'routine', 'deep_clean', 'turndown', 'inspection', 'special'
  assigned_to UUID,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TIME,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  inspection_notes TEXT,
  inspection_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lost and Found
CREATE TABLE public.lost_and_found (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_description TEXT NOT NULL,
  found_location TEXT NOT NULL,
  found_date DATE NOT NULL DEFAULT CURRENT_DATE,
  found_by TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'stored', -- 'stored', 'claimed', 'disposed'
  storage_location TEXT,
  guest_id UUID REFERENCES public.guests(id),
  claimed_date DATE,
  claimed_by TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Housekeeping Inspections
CREATE TABLE public.housekeeping_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  inspector_id UUID,
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_score INTEGER,
  cleanliness_score INTEGER,
  amenities_score INTEGER,
  maintenance_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. GUEST ENHANCEMENTS
-- ============================================

-- Guest Preferences
CREATE TABLE public.guest_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'room', 'dining', 'amenities', 'communication'
  preference_key TEXT NOT NULL,
  preference_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guest_id, category, preference_key)
);

-- Guest Feedback
CREATE TABLE public.guest_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id),
  reservation_id UUID REFERENCES public.reservations(id),
  feedback_type TEXT NOT NULL, -- 'review', 'complaint', 'suggestion', 'compliment'
  department TEXT,
  rating INTEGER,
  title TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'resolved', 'closed'
  response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty Program
CREATE TABLE public.loyalty_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE UNIQUE,
  member_number TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tier_expiry DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty Transactions
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'earn', 'redeem', 'expire', 'adjust'
  points INTEGER NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Guest Communications
CREATE TABLE public.guest_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'email', 'sms', 'phone', 'in_person'
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. FINANCE ENHANCEMENTS
-- ============================================

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  guest_id UUID REFERENCES public.guests(id),
  reservation_id UUID REFERENCES public.reservations(id),
  company_id UUID REFERENCES public.pos_companies(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice Items
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id),
  reservation_id UUID REFERENCES public.reservations(id),
  guest_id UUID REFERENCES public.guests(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  account_id UUID REFERENCES public.accounts(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
  receipt_url TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax Configuration
CREATE TABLE public.tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  rate NUMERIC NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT[], -- 'room', 'food', 'beverage', 'service'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. STAFF/HR ENHANCEMENTS
-- ============================================

-- Staff Time Clock (already created, adding attendance summary)
CREATE TABLE IF NOT EXISTS public.staff_time_clock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.staff_members(id),
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff Schedules
CREATE TABLE public.staff_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  department TEXT,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled'
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leave Requests
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL, -- 'annual', 'sick', 'personal', 'unpaid'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leave Balances
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  entitled_days NUMERIC NOT NULL DEFAULT 0,
  used_days NUMERIC NOT NULL DEFAULT 0,
  pending_days NUMERIC NOT NULL DEFAULT 0,
  remaining_days NUMERIC GENERATED ALWAYS AS (entitled_days - used_days - pending_days) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, leave_type, year)
);

-- Payroll Records
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  net_pay NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'paid'
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. BANQUET ENHANCEMENTS
-- ============================================

-- Event Catering Orders
CREATE TABLE public.event_catering (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.banquet_events(id) ON DELETE CASCADE,
  menu_package TEXT,
  dietary_requirements JSONB DEFAULT '[]'::jsonb,
  beverage_selections JSONB DEFAULT '[]'::jsonb,
  serving_time TIME,
  serving_style TEXT, -- 'buffet', 'plated', 'family_style', 'cocktail'
  guest_count INTEGER,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event Venue Setups
CREATE TABLE public.event_venue_setups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.banquet_events(id) ON DELETE CASCADE,
  layout_type TEXT, -- 'theater', 'classroom', 'banquet', 'u_shape', 'boardroom', 'cocktail'
  capacity INTEGER,
  equipment_needed JSONB DEFAULT '[]'::jsonb,
  decoration_checklist JSONB DEFAULT '[]'::jsonb,
  setup_time TIME,
  breakdown_time TIME,
  floor_plan_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event Staff Assignments
CREATE TABLE public.event_staff_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.banquet_events(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_members(id),
  staff_name TEXT,
  role TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. CHANNEL MANAGER
-- ============================================

-- OTA Channels
CREATE TABLE public.ota_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  api_endpoint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  commission_rate NUMERIC DEFAULT 0,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rate Availability
CREATE TABLE public.rate_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_count INTEGER NOT NULL DEFAULT 1,
  rate NUMERIC NOT NULL,
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER,
  closed_to_arrival BOOLEAN DEFAULT false,
  closed_to_departure BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, date)
);

-- 8. SYSTEM/ADMIN ENHANCEMENTS
-- ============================================

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System Settings (extended)
-- Using existing settings table with new keys

-- Enable RLS on all tables
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_catering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_venue_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ota_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Staff Access
CREATE POLICY "Staff can manage inventory_categories" ON public.inventory_categories FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage suppliers" ON public.suppliers FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage inventory_items" ON public.inventory_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage purchase_orders" ON public.purchase_orders FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage purchase_order_items" ON public.purchase_order_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage stock_movements" ON public.stock_movements FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage housekeeping_tasks" ON public.housekeeping_tasks FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage lost_and_found" ON public.lost_and_found FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage housekeeping_inspections" ON public.housekeeping_inspections FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage guest_preferences" ON public.guest_preferences FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage guest_feedback" ON public.guest_feedback FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage loyalty_members" ON public.loyalty_members FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage loyalty_transactions" ON public.loyalty_transactions FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage guest_communications" ON public.guest_communications FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage invoices" ON public.invoices FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage invoice_items" ON public.invoice_items FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage expenses" ON public.expenses FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage tax_rates" ON public.tax_rates FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage staff_time_clock" ON public.staff_time_clock FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage staff_schedules" ON public.staff_schedules FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage leave_requests" ON public.leave_requests FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage leave_balances" ON public.leave_balances FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Admins can manage payroll_records" ON public.payroll_records FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can manage event_catering" ON public.event_catering FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage event_venue_setups" ON public.event_venue_setups FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage event_staff_assignments" ON public.event_staff_assignments FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Admins can manage ota_channels" ON public.ota_channels FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view ota_channels" ON public.ota_channels FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage rate_availability" ON public.rate_availability FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Admins can view audit_log" ON public.audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;

-- Add triggers for updated_at
CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_housekeeping_tasks_updated_at BEFORE UPDATE ON public.housekeeping_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lost_and_found_updated_at BEFORE UPDATE ON public.lost_and_found FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_preferences_updated_at BEFORE UPDATE ON public.guest_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_feedback_updated_at BEFORE UPDATE ON public.guest_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loyalty_members_updated_at BEFORE UPDATE ON public.loyalty_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_schedules_updated_at BEFORE UPDATE ON public.staff_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_catering_updated_at BEFORE UPDATE ON public.event_catering FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_venue_setups_updated_at BEFORE UPDATE ON public.event_venue_setups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ota_channels_updated_at BEFORE UPDATE ON public.ota_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rate_availability_updated_at BEFORE UPDATE ON public.rate_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tax rates
INSERT INTO public.tax_rates (name, code, rate, is_default, applies_to) VALUES
  ('Service Tax', 'SERVICE', 10, false, ARRAY['room', 'food', 'service']),
  ('VAT', 'VAT', 13, true, ARRAY['room', 'food', 'beverage']),
  ('Tourism Levy', 'TOURISM', 2, false, ARRAY['room']);

-- Insert default inventory categories
INSERT INTO public.inventory_categories (name, description) VALUES
  ('Linens', 'Bed sheets, towels, pillows, blankets'),
  ('Toiletries', 'Shampoo, soap, shower gel, amenities'),
  ('Minibar', 'Beverages, snacks, chocolates'),
  ('Housekeeping Supplies', 'Cleaning products, equipment'),
  ('F&B - Kitchen', 'Food ingredients and kitchen supplies'),
  ('F&B - Bar', 'Alcoholic and non-alcoholic beverages'),
  ('Maintenance', 'Spare parts, tools, equipment'),
  ('Office Supplies', 'Stationery, printing supplies');

-- Insert default OTA channels
INSERT INTO public.ota_channels (name, code, commission_rate) VALUES
  ('Booking.com', 'BOOKING', 15),
  ('Expedia', 'EXPEDIA', 18),
  ('Agoda', 'AGODA', 15),
  ('Airbnb', 'AIRBNB', 3),
  ('Hotels.com', 'HOTELS', 20),
  ('Direct Website', 'DIRECT', 0);