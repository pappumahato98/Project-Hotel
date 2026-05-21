import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const RealtimeListener = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("global-sync");

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["settings"] });

          if (payload.new?.key === "ui_preferences") {
            queryClient.invalidateQueries({ queryKey: ["settings", "ui_preferences"] });
          }

          if (payload.new?.key === "system_lockdown") {
            const isLockdown = payload.new.value === true;
            if (isLockdown) {
              toast.error("SYSTEM LOCKDOWN INITIATED", {
                description: "The system is entering emergency maintenance mode.",
                duration: Infinity,
              });
            } else {
              toast.success("SYSTEM LOCKDOWN LIFTED", {
                description: "Normal operations have resumed.",
              });
            }
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["reservations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_folios" }, () => {
        queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "banquet_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["guests"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
};