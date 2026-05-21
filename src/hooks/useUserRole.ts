import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;

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
