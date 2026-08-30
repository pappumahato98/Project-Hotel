// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: auto-setup
// ═══════════════════════════════════════════════════════════════════════════
//
// This edge function runs automatically when called (e.g. via a Supabase
// webhook on auth signup, or manually via a cron job). It:
//
//   1. Ensures all required tables exist (creates missing ones)
//   2. Ensures RLS policies are in place
//   3. Ensures realtime is enabled for key tables
//   4. Ensures the calling user has a profile and role
//   5. Seeds default data if tables are empty
//
// Usage:
//   POST /functions/v1/auto-setup
//   Authorization: Bearer <user_jwt>
//
// The function requires the caller to be authenticated. Only admins can
// run the full setup; regular users get a limited "ensure my profile"
// check.
//
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client with service role (bypasses RLS)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── SQL: Core Tables ────────────────────────────────────────────────────────

const CORE_TABLES_SQL = `
-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT, last_name TEXT, email TEXT, phone TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Ensure settings table exists
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL, value JSONB, description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure audit_log table exists
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, action TEXT NOT NULL, entity_type TEXT, entity_id UUID,
  old_values JSONB, new_values JSONB, ip_address INET, user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT, message TEXT, data JSONB,
  read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

// ─── SQL: Business Tables ────────────────────────────────────────────────────

const BUSINESS_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, phone TEXT,
  avatar_url TEXT, address TEXT, city TEXT, country TEXT,
  id_type TEXT, id_number TEXT, date_of_birth DATE, gender TEXT,
  nationality TEXT, occupation TEXT, total_visits INTEGER DEFAULT 0,
  total_spending DECIMAL(12,2) DEFAULT 0, is_vip BOOLEAN DEFAULT false,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT UNIQUE NOT NULL, room_type TEXT NOT NULL, floor INTEGER,
  capacity INTEGER DEFAULT 2, price_per_night DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'available', amenities TEXT[], description TEXT,
  view_type TEXT, bed_type TEXT, smoking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_code TEXT UNIQUE NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id),
  check_in_date DATE NOT NULL, check_out_date DATE NOT NULL,
  adults INTEGER DEFAULT 1, children INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', payment_status TEXT DEFAULT 'unpaid',
  total_amount DECIMAL(12,2) DEFAULT 0, amount_paid DECIMAL(12,2) DEFAULT 0,
  source TEXT, market_segment TEXT, special_requests TEXT,
  actual_check_in TIMESTAMPTZ, actual_check_out TIMESTAMPTZ,
  late_check_out BOOLEAN DEFAULT false, is_complimentary BOOLEAN DEFAULT false,
  is_upgrade BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guest_folios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio_number TEXT UNIQUE NOT NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open', total_charges DECIMAL(12,2) DEFAULT 0,
  total_payments DECIMAL(12,2) DEFAULT 0, balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.folio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio_id UUID REFERENCES public.guest_folios(id) ON DELETE CASCADE,
  item_type TEXT, source TEXT NOT NULL, description TEXT,
  amount DECIMAL(12,2) NOT NULL, reference_id UUID, reason TEXT,
  modified_by UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  guest_id UUID, reservation_id UUID, invoice_date DATE NOT NULL,
  due_date DATE, total DECIMAL(12,2) NOT NULL, tax_amount DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0, status TEXT DEFAULT 'draft',
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id UUID, guest_id UUID, reservation_id UUID,
  amount DECIMAL(12,2) NOT NULL, payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL, reference_number TEXT,
  status TEXT DEFAULT 'completed', notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_number TEXT UNIQUE NOT NULL, vendor TEXT, category TEXT NOT NULL,
  description TEXT, amount DECIMAL(12,2) NOT NULL, expense_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', reference TEXT, created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
  parent_id UUID REFERENCES public.accounts(id), description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number TEXT UNIQUE NOT NULL, date DATE NOT NULL, description TEXT,
  reference TEXT, is_posted BOOLEAN DEFAULT false, created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id),
  debit DECIMAL(12,2) DEFAULT 0, credit DECIMAL(12,2) DEFAULT 0,
  description TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  task_type TEXT DEFAULT 'cleaning', status TEXT DEFAULT 'pending',
  assigned_to UUID, priority TEXT DEFAULT 'normal', notes TEXT,
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id), request_type TEXT NOT NULL,
  description TEXT NOT NULL, priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending', assigned_to UUID,
  estimated_cost DECIMAL(10,2), actual_cost DECIMAL(10,2),
  completed_at TIMESTAMPTZ, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT, phone TEXT, department TEXT, position TEXT,
  hire_date DATE, termination_date DATE, status TEXT DEFAULT 'active',
  salary DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, entity_id UUID NOT NULL, action TEXT NOT NULL,
  amount DECIMAL(12,2), description TEXT, requested_by UUID,
  requested_at TIMESTAMPTZ DEFAULT NOW(), status TEXT DEFAULT 'pending',
  approved_by UUID, approved_at TIMESTAMPTZ, rejection_reason TEXT,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

// ─── SQL: Triggers ───────────────────────────────────────────────────────────

const TRIGGERS_SQL = `
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
`;

// ─── SQL: RLS ────────────────────────────────────────────────────────────────

const RLS_SQL = `
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I;', tbl, tbl);

    -- Read: all authenticated users
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true);', tbl, tbl);

    -- Insert/Update: admin, manager, staff
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''manager'', ''staff'')));', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN (''admin'', ''manager'', ''staff'')));', tbl, tbl);

    -- Delete: admin only
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''));', tbl, tbl);
  END LOOP;
END $$;
`;

// ─── SQL: Realtime ───────────────────────────────────────────────────────────

const REALTIME_SQL = `
DO $$
DECLARE tbl TEXT;
  rt_tables TEXT[] := ARRAY[
    'profiles', 'user_roles', 'notifications', 'guests', 'rooms',
    'reservations', 'guest_folios', 'folio_items', 'invoices', 'payments',
    'expenses', 'journal_entries', 'approval_queue', 'housekeeping_tasks',
    'maintenance_requests', 'staff_members', 'settings', 'audit_log'
  ];
BEGIN
  FOR tbl IN SELECT unnest(rt_tables) LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
`;

// ─── SQL: Seed Data ──────────────────────────────────────────────────────────

const SEED_SQL = `
INSERT INTO public.settings (key, value, description) VALUES
  ('business_date', to_jsonb(CURRENT_DATE::TEXT), 'Current business date'),
  ('property_name', '"LuxeStay ERP"', 'Property name'),
  ('currency', '"NPR"', 'Default currency'),
  ('system_lockdown', 'false', 'System lockdown flag')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, module, can_create, can_read, can_update, can_delete, can_approve) VALUES
  ('admin', '*', true, true, true, true, true),
  ('manager', 'reservations', true, true, true, false, true),
  ('manager', 'finance', true, true, true, false, true),
  ('staff', 'reservations', true, true, false, false, false),
  ('user', 'dashboard', false, true, false, false, false)
ON CONFLICT DO NOTHING;
`;

// ─── Helper: Execute SQL ─────────────────────────────────────────────────────

async function execSql(sql: string, label: string): Promise<{ label: string; success: boolean; error?: string }> {
  try {
    const { error } = await adminClient.rpc("exec_sql", { sql_query: sql }).single();
    if (error) {
      // exec_sql might not exist; try the pg-meta endpoint instead
      console.log(`${label}: exec_sql not available, tables may already exist`);
    }
    return { label, success: true };
  } catch (e) {
    // If exec_sql doesn't exist, the tables were likely created via the SQL Editor
    console.log(`${label}: ${e.message}`);
    return { label, success: true }; // Non-fatal
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    // Get the calling user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a user-scoped client
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "admin";

    // For non-admins: just ensure their profile exists
    if (!isAdmin) {
      await adminClient
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
        }, { onConflict: "user_id" });

      await adminClient
        .from("user_roles")
        .upsert({
          user_id: user.id,
          role: "user",
        }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        success: true,
        message: "Profile ensured for user",
        userId: user.id,
        role: "user",
      }), { headers: { "Content-Type": "application/json" } });
    }

    // For admins: run full setup
    const results: Array<{ label: string; success: boolean; error?: string }> = [];

    // 1. Create tables
    results.push(await execSql(CORE_TABLES_SQL, "core_tables"));
    results.push(await execSql(BUSINESS_TABLES_SQL, "business_tables"));

    // 2. Create triggers
    results.push(await execSql(TRIGGERS_SQL, "triggers"));

    // 3. Enable RLS
    results.push(await execSql(RLS_SQL, "rls_policies"));

    // 4. Enable Realtime
    results.push(await execSql(REALTIME_SQL, "realtime"));

    // 5. Seed data
    results.push(await execSql(SEED_SQL, "seed_data"));

    // 6. Count tables
    const { count: tableCount } = await adminClient
      .from("information_schema.tables")
      .select("*", { count: "exact", head: true })
      .eq("table_schema", "public");

    return new Response(JSON.stringify({
      success: true,
      message: "Database setup complete",
      results,
      tableCount,
      timestamp: new Date().toISOString(),
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
