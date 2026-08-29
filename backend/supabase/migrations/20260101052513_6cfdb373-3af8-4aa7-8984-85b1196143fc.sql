-- Create staff_members table for staff management
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  salary NUMERIC,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_members
CREATE POLICY "Admins can manage staff" ON public.staff_members
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view staff" ON public.staff_members
  FOR SELECT USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view own record" ON public.staff_members
  FOR SELECT USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();