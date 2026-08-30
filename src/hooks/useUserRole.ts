import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { queryKeys } from "@/lib/queryKeys";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.role(user?.id),
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      // Tolerate missing table gracefully (e.g. before migrations are applied).
      // The user_roles table is created by the 20260208200000_rbac_sync migration.
      // If it doesn't exist yet, return null (no role) instead of throwing,
      // which would leave ProtectedRoute stuck in loading forever.
      if (error) {
        // PGRST205 = "Could not find the table in the schema cache"
        // 42P01 = "relation does not exist" (Postgres native)
        if (error.code === "PGRST205" || (error as any).code === "42P01") {
          console.warn("user_roles table not found — returning null role. Apply the database migrations.");
          return null;
        }
        throw error;
      }

      const roles = (data ?? []).map((r) => r.role as AppRole);
      if (roles.length === 0) return null;

      // Pick highest role if multiple rows exist
      const priority: Record<AppRole, number> = {
        user: 0,
        staff: 1,
        manager: 2,
        admin: 3,
      };

      return roles.reduce((best, current) => (priority[current] > priority[best] ? current : best));
    },
    enabled: !!user,
    retry: false, // Don't retry on missing-table errors
  });
}

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return { isAdmin: role === "admin", isLoading };
}

export function useIsManager() {
  const { data: role, isLoading } = useUserRole();
  return { isManager: role === "admin" || role === "manager", isLoading };
}

export function useIsStaff() {
  const { data: role, isLoading } = useUserRole();
  return { isStaff: role === "admin" || role === "manager" || role === "staff", isLoading };
}
