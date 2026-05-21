-- Secure sensitive settings by restricting access to admins only
-- This prevents non-admin staff from viewing API keys and payment gateway secrets

-- Drop the overly permissive staff policy
DROP POLICY IF EXISTS "Staff can view settings" ON public.settings;

-- Create a more restrictive policy for non-admin staff
CREATE POLICY "Staff can view non-sensitive settings"
ON public.settings
FOR SELECT
USING (
  is_staff(auth.uid())
  AND key NOT IN ('api_keys', 'payment_gateways')
);

-- Ensure admins still have full access (the existing policy already covers this, but we'll re-assert it for clarity)
-- Note: 'Admins can manage settings' already exists with FOR ALL, which includes SELECT
