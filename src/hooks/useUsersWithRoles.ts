import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_PRIORITY: Record<AppRole, number> = {
  user: 0,
  staff: 1,
  manager: 2,
  admin: 3,
};

export const getHighestRole = (roles: AppRole[]): AppRole => {
  if (roles.length === 0) return "user";
  return roles.reduce((best, current) =>
    ROLE_PRIORITY[current] > ROLE_PRIORITY[best] ? current : best
  );
};

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  allRoles: AppRole[];
  hasMultipleRoles: boolean;
  created_at: string;
}

export interface RoleChangeAudit {
  id: string;
  user_id: string;
  changed_by_user_id: string;
  old_role: string;
  new_role: string;
  reason: string | null;
  created_at: string;
  user_email?: string;
  changed_by_email?: string;
}

export const roleConfig: Record<AppRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  manager: { label: "Manager", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  staff: { label: "Staff", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  user: { label: "User", color: "bg-muted text-muted-foreground border-border" },
};

export const useUsersWithRoles = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, created_at");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRoles = roles.filter((r) => r.user_id === profile.user_id);
        const allRoles = userRoles.map((r) => r.role as AppRole);
        const hasMultipleRoles = allRoles.length > 1;
        const highestRole = getHighestRole(allRoles);

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: highestRole,
          allRoles,
          hasMultipleRoles,
          created_at: profile.created_at,
        };
      });

      return usersWithRoles;
    },
    enabled,
  });
};

export const useRoleChangeAudit = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["role-change-audit"],
    queryFn: async () => {
      const { data: audits, error: auditError } = await supabase
        .from("role_change_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (auditError) throw auditError;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email");

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.email]) || []);

      return audits.map((audit) => ({
        ...audit,
        user_email: profileMap.get(audit.user_id) || "Unknown",
        changed_by_email: profileMap.get(audit.changed_by_user_id) || "Unknown",
      })) as RoleChangeAudit[];
    },
    enabled,
  });
};

export const useRolePermissions = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("role_permissions")
        .select("*");

      if (error) throw error;
      return data;
    },
    enabled,
  });
};

export const useOTAChannels = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["ota-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ota_channels")
        .select("*");

      if (error) throw error;
      return data;
    },
    enabled,
  });
};

export const useOTASyncLogs = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["ota-sync-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ota_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled,
  });
};

export const useAdminAuditLogs = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email");

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.email]) || []);

      return data.map(log => ({
        ...log,
        user_email: profileMap.get(log.user_id || "") || "System",
      }));
    },
    enabled,
  });
};

export const useUpdateRolePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, permission, action }: { role: AppRole; permission: string; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const { error } = await (supabase as any)
          .from("role_permissions")
          .insert({ role, permission });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("permission", permission);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast.success("Role permissions updated");
    },
    onError: (error) => {
      toast.error("Failed to update permissions: " + error.message);
    },
  });
};

export const useUpdateOTAChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active, sync_status }: { id: string; is_active?: boolean; sync_status?: string }) => {
      const { error } = await supabase
        .from("ota_channels")
        .update({ is_active, sync_status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ota-channels"] });
      toast.success("Channel configuration updated");
    },
    onError: (error) => {
      toast.error("Failed to update channel: " + error.message);
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, oldRole, newRole }: { userId: string; oldRole: AppRole; newRole: AppRole }) => {
      const { data: existingRoles, error: rolesFetchError } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", userId);

      if (rolesFetchError) throw rolesFetchError;

      const roles = (existingRoles ?? []).map((r) => r.role as AppRole);
      const alreadyHasNewRole = roles.includes(newRole);

      if (!alreadyHasNewRole) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (insertError) throw insertError;
      }

      const { error: cleanupError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .neq("role", newRole);

      if (cleanupError) throw cleanupError;

      if (oldRole !== newRole) {
        const { error: auditError } = await supabase
          .from("role_change_audit")
          .insert({
            user_id: userId,
            changed_by_user_id: user?.id || "",
            old_role: oldRole,
            new_role: newRole,
            reason: `Role changed from ${oldRole} to ${newRole}`,
          });

        if (auditError) throw auditError;

        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            title: "Role Updated",
            message: `Your role has been changed from ${roleConfig[oldRole].label} to ${roleConfig[newRole].label}`,
            type: "role_change",
            category: "system",
          });

        if (notifError) console.error("Failed to create notification:", notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-change-audit"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });
};
