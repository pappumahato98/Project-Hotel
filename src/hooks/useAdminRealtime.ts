import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
          queryClient.invalidateQueries({ queryKey: ["security-audit-logs"] });
          queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
          queryClient.invalidateQueries({ queryKey: ["users-with-multiple-roles"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
          queryClient.invalidateQueries({ queryKey: ["users-with-multiple-roles"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_permissions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ota_sync_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ota-sync-logs"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ota_channels" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ota-channels"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["settings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
