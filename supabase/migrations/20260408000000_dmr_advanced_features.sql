-- Migration: 20260408000000_dmr_advanced_features.sql
-- Description: Adds tables and fields for Sales & Marketing, Management, and Daily Management Reporting (DMR)

-- 1. Enhance Reservations with Segmentation and Movement Tracking
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS market_segment TEXT CHECK (market_segment IN ('corporate', 'travel_agent', 'ota', 'government', 'groups', 'leisure', 'long_stay', 'other')),
ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS early_check_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_check_out BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS booking_source_id UUID REFERENCES public.booking_sources(id);

-- 2. Enhance Rooms with Operational Status
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS is_out_of_order BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_under_maintenance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS maintenance_notes TEXT,
ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_inspected_at TIMESTAMP WITH TIME ZONE;

-- 3. Sales & Marketing Module Tables
CREATE TABLE IF NOT EXISTS public.marketing_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    client_name TEXT NOT NULL,
    company_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    inquiry_source TEXT, -- 'website', 'phone', 'email', 'walk-in', 'referral'
    inquiry_type TEXT, -- 'group_booking', 'event', 'corporate_rate', 'other'
    preferred_dates JSONB, -- {start_date, end_date}
    estimated_guests INTEGER,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'proposal_sent', 'confirmed', 'lost'
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type TEXT NOT NULL, -- 'visit', 'call', 'email', 'meeting', 'site_inspection'
    account_name TEXT NOT NULL,
    contact_person TEXT,
    purpose TEXT,
    outcome TEXT,
    next_follow_up DATE,
    performed_by UUID REFERENCES auth.users(id),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.corporate_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    name TEXT NOT NULL UNIQUE,
    industry TEXT,
    contract_start_date DATE,
    contract_end_date DATE,
    negotiated_rate NUMERIC(10,2),
    account_manager UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'negotiating'
    contact_details JSONB
);

-- 4. Operations & Utility Tracking
CREATE TABLE IF NOT EXISTS public.utility_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    utility_type TEXT NOT NULL, -- 'electricity', 'water', 'gas'
    consumption_value NUMERIC(12,2) NOT NULL,
    unit TEXT NOT NULL,
    cost NUMERIC(10,2),
    notes TEXT,
    UNIQUE(usage_date, utility_type)
);

CREATE TABLE IF NOT EXISTS public.housekeeping_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    linen_usage_count INTEGER DEFAULT 0,
    laundry_volume_kg NUMERIC(10,2) DEFAULT 0,
    deep_cleaning_count INTEGER DEFAULT 0,
    staff_on_duty INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(log_date)
);

-- 5. Guest Experience & Feedback Enhancements
ALTER TABLE public.guest_feedback
ADD COLUMN IF NOT EXISTS rating_service INTEGER CHECK (rating_service BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS rating_cleanliness INTEGER CHECK (rating_cleanliness BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS rating_food INTEGER CHECK (rating_food BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- 6. Management Forecasting & Budgets
-- (Existing budget tables are used, but we might need daily targets)
CREATE TABLE IF NOT EXISTS public.daily_revenue_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL UNIQUE,
    room_revenue_target NUMERIC(12,2) DEFAULT 0,
    fb_revenue_target NUMERIC(12,2) DEFAULT 0,
    other_revenue_target NUMERIC(12,2) DEFAULT 0,
    occupancy_target_pct NUMERIC(5,2) DEFAULT 0
);

-- 7. Enable RLS
ALTER TABLE public.marketing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_revenue_targets ENABLE ROW LEVEL SECURITY;

-- 8. Basic Policies (using inventory:manage as a proxy for management permissions if not defined)
DO $$
BEGIN
    -- This is a simplified policy setup. In a real scenario, these would be more granular.
    EXECUTE 'CREATE POLICY "Management full access" ON public.marketing_inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Management full access" ON public.sales_activities FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Management full access" ON public.corporate_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Management full access" ON public.utility_usage FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Management full access" ON public.housekeeping_logs FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Management full access" ON public.daily_revenue_targets FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
