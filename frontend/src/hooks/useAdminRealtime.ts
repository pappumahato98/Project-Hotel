import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export function useAdminRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Unique channel name for each component instance to avoid conflicts
    const channelId = `admin-changes-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.users.securityAuditLogs });
          queryClient.invalidateQueries({ queryKey: queryKeys.users.adminAuditLogs });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.users.multipleRoles });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.users.multipleRoles });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_permissions" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.users.rolePermissions });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ota_sync_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.channelManager.syncLogs });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ota_channels" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.channelManager.channels });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
