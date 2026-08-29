-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  room_type TEXT NOT NULL CHECK (room_type IN ('standard', 'deluxe', 'suite', 'presidential')),
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  price_per_night DECIMAL(10,2) NOT NULL,
  amenities TEXT[],
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_type TEXT CHECK (id_type IN ('passport', 'driver_license', 'national_id', 'other')),
  id_number TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  is_vip BOOLEAN DEFAULT false,
  notes TEXT,
  total_visits INTEGER DEFAULT 0,
  total_spending DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_code TEXT NOT NULL UNIQUE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMP WITH TIME ZONE,
  actual_check_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show')),
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  special_requests TEXT,
  source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'online', 'agent', 'corporate', 'walk-in')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is authenticated staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'staff')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_staff(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Rooms policies (staff can view and manage, authenticated users can view)
CREATE POLICY "Authenticated users can view rooms"
ON public.rooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage rooms"
ON public.rooms FOR ALL
USING (public.is_staff(auth.uid()));

-- Guests policies (staff can manage)
CREATE POLICY "Staff can view guests"
ON public.guests FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage guests"
ON public.guests FOR ALL
USING (public.is_staff(auth.uid()));

-- Reservations policies
CREATE POLICY "Staff can view all reservations"
ON public.reservations FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage reservations"
ON public.reservations FOR ALL
USING (public.is_staff(auth.uid()));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  
  -- Assign default staff role (for testing - in production you'd want admin approval)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate reservation code
CREATE OR REPLACE FUNCTION public.generate_reservation_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reservation_code := 'RES-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_reservation_code
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  WHEN (NEW.reservation_code IS NULL)
  EXECUTE FUNCTION public.generate_reservation_code();

-- Insert sample rooms
INSERT INTO public.rooms (room_number, room_type, floor, capacity, price_per_night, amenities, status) VALUES
('101', 'standard', 1, 2, 120.00, ARRAY['WiFi', 'TV', 'AC'], 'available'),
('102', 'standard', 1, 2, 120.00, ARRAY['WiFi', 'TV', 'AC'], 'occupied'),
('103', 'standard', 1, 2, 120.00, ARRAY['WiFi', 'TV', 'AC'], 'cleaning'),
('201', 'deluxe', 2, 2, 180.00, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Safe'], 'available'),
('202', 'deluxe', 2, 3, 200.00, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Safe'], 'available'),
('301', 'suite', 3, 4, 350.00, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Safe', 'Jacuzzi', 'Balcony'], 'maintenance'),
('302', 'suite', 3, 4, 350.00, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Safe', 'Jacuzzi', 'Balcony'], 'available'),
('401', 'presidential', 4, 6, 600.00, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Safe', 'Jacuzzi', 'Balcony', 'Kitchen', 'Living Room'], 'available'),
('105', 'standard', 1, 2, 120.00, ARRAY['WiFi', 'TV', 'AC'], 'available'),
('502', 'suite', 5, 4, 390.00, ARRAY['WiFi', 'TV', 'AC', 'Mini Bar', 'Safe', 'Jacuzzi'], 'occupied');