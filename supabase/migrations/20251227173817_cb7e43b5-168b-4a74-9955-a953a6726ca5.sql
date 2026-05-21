-- Create role_change_audit table for tracking role changes
CREATE TABLE public.role_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  changed_by_user_id UUID NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role audit logs"
ON public.role_change_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert role audit logs"
ON public.role_change_audit
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Staff can view notifications
CREATE POLICY "Staff can view notifications"
ON public.notifications
FOR SELECT
USING (is_staff(auth.uid()) OR user_id = auth.uid() OR user_id IS NULL);

-- Staff can update (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (is_staff(auth.uid()) OR user_id = auth.uid());

-- Staff can insert notifications
CREATE POLICY "Staff can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (is_staff(auth.uid()));

-- Create booking_sources table for custom booking sources
CREATE TABLE public.booking_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  commission_percentage NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_sources ENABLE ROW LEVEL SECURITY;

-- Staff can view booking sources
CREATE POLICY "Staff can view booking sources"
ON public.booking_sources
FOR SELECT
USING (is_staff(auth.uid()));

-- Admins can manage booking sources
CREATE POLICY "Admins can manage booking sources"
ON public.booking_sources
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create rate_plans table for custom rate plans
CREATE TABLE public.rate_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  min_nights INTEGER,
  max_nights INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;

-- Staff can view rate plans
CREATE POLICY "Staff can view rate plans"
ON public.rate_plans
FOR SELECT
USING (is_staff(auth.uid()));

-- Admins can manage rate plans
CREATE POLICY "Admins can manage rate plans"
ON public.rate_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add update triggers
CREATE TRIGGER update_booking_sources_updated_at
BEFORE UPDATE ON public.booking_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rate_plans_updated_at
BEFORE UPDATE ON public.rate_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default booking sources
INSERT INTO public.booking_sources (name, code, commission_percentage, is_system) VALUES
('Direct', 'direct', 0, true),
('Booking.com', 'booking', 15, true),
('Expedia', 'expedia', 18, true),
('Airbnb', 'airbnb', 3, true),
('Walk-in', 'walkin', 0, true);

-- Insert default rate plans
INSERT INTO public.rate_plans (name, code, description, discount_percentage, is_system) VALUES
('Standard Rate', 'standard', 'Regular pricing with full amenities', 0, true),
('Early Bird', 'earlybird', 'Book 30+ days in advance', 15, true),
('Last Minute', 'lastminute', 'Book within 48 hours', 10, true),
('Weekly Rate', 'weekly', '7+ night stays', 20, true),
('Corporate Rate', 'corporate', 'Business traveler discounts', 12, true);