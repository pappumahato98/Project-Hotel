## 2026-02-10 - Sensitive Configuration Exposure via RLS
**Vulnerability:** Broad RLS policies on the `settings` table allowed any staff member to view all settings, including sensitive API keys (`api_keys`) and payment gateway secrets (`payment_gateways`).
**Learning:** In projects using a single key-value `settings` table, a generic "Staff can view" policy creates a significant risk if sensitive integration secrets are stored alongside UI configuration.
**Prevention:** Implement granular RLS policies that explicitly exclude sensitive keys from general staff access, or separate secrets into a dedicated, admin-only table.

## 2026-02-10 - Weak Default Password Policy
**Vulnerability:** The authentication system allowed passwords as short as 6 characters, which is insufficient for enterprise-grade security and vulnerable to brute-force attacks.
**Learning:** Default validation schemas in frontend frameworks often use low minimums for "developer convenience," which can easily leak into production.
**Prevention:** Enforce a minimum of 10 characters for all new user accounts (Sign Up) to prevent account weakness without breaking existing sessions (Sign In), and provide a visual strength indicator.

## 2026-02-10 - Security Monitoring Visibility
**Enhancement:** Added a "Security Breach" tab to the admin console to provide visibility into security-related audit logs and system health.
**Learning:** Security monitoring should be integrated into administrative tools to enable proactive threat detection. Using existing audit logs for security insights reduces "security theater" and provides real value.
**Prevention:** Always provide administrators with clear indicators of system integrity and recent suspicious activities.

## 2026-02-10 - Dynamic Dashboard Data
**Enhancement:** Replaced static dashboard metrics with real-time data from Supabase and added a dynamic security advisory card for administrators.
**Learning:** Hardcoded metrics in a dashboard are not just "incomplete"—they are misleading and can mask actual system issues. Integrating security alerts directly into the main dashboard ensures they aren't missed.
**Prevention:** Use custom hooks to centralize data fetching for metrics and always include a security health check in high-level overviews.
