-- Allow users to view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Update existing policy to be more descriptive
DROP POLICY IF EXISTS "Admins can view audit_log" ON public.audit_log;
CREATE POLICY "Admins and Managers can view all audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
