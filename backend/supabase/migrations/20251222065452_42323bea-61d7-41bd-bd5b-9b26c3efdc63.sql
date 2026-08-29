-- Create settings table for admin configuration
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Staff can view settings
CREATE POLICY "Staff can view settings"
ON public.settings
FOR SELECT
USING (is_staff(auth.uid()));

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default check-in field settings
INSERT INTO public.settings (key, value)
VALUES ('check_in_fields', '{"id_required": true, "phone_required": false, "email_required": false}');