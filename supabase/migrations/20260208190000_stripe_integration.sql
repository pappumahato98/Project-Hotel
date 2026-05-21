-- Add Stripe fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
    payment_method TEXT,
    stripe_payment_intent_id TEXT,
    guest_id UUID REFERENCES public.guests(id),
    reservation_id UUID REFERENCES public.reservations(id),
    metadata JSONB
);

-- Enable Realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
