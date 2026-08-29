import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TablePresence {
  tableId: string;
  users: {
    id: string;
    name: string;
    avatar?: string;
    viewingSince: string;
  }[];
}

export function useTablePresence(tableId?: string) {
  const { user, profile } = useAuth();
  const [presenceByTable, setPresenceByTable] = useState<Record<string, TablePresence["users"]>>({});
  const [isConnected, setIsConnected] = useState(false);

  const trackPresence = useCallback(
    async (tableIdToTrack: string | null) => {
      if (!user) return;

      const channelName = "pos-table-presence";
      const channel = supabase.channel(channelName);

      const userPresence = {
        id: user.id,
        name: profile?.first_name
          ? `${profile.first_name} ${profile.last_name || ""}`.trim()
          : user.email?.split("@")[0] || "User",
        avatar: profile?.avatar_url || undefined,
        viewingSince: new Date().toISOString(),
        currentTable: tableIdToTrack,
      };

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const tableUsers: Record<string, TablePresence["users"]> = {};

          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.currentTable) {
                if (!tableUsers[presence.currentTable]) {
                  tableUsers[presence.currentTable] = [];
                }
                // Don't add ourselves to the list
                if (presence.id !== user.id) {
                  tableUsers[presence.currentTable].push({
                    id: presence.id,
                    name: presence.name,
                    avatar: presence.avatar,
                    viewingSince: presence.viewingSince,
                  });
                }
              }
            });
          });

          setPresenceByTable(tableUsers);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          // Handle new user joining
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          // Handle user leaving
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
            await channel.track(userPresence);
          } else {
            setIsConnected(false);
          }
        });

      return () => {
        channel.untrack();
        supabase.removeChannel(channel);
      };
    },
    [user, profile]
  );

  // Track when viewing a specific table
  useEffect(() => {
    if (!user) return;

    const cleanup = trackPresence(tableId || null);

    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [user, tableId, trackPresence]);

  // Get users viewing a specific table
  const getUsersForTable = useCallback(
    (tId: string): TablePresence["users"] => {
      return presenceByTable[tId] || [];
    },
    [presenceByTable]
  );

  return {
    presenceByTable,
    getUsersForTable,
    isConnected,
  };
}
