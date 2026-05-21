import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePMSRealtimeOptions {
  onRoomUpdate?: () => void;
  onReservationUpdate?: () => void;
}

export function usePMSRealtime(options: UsePMSRealtimeOptions = {}) {
  const { onRoomUpdate, onReservationUpdate } = options;

  useEffect(() => {
    const roomsChannel = supabase
      .channel("pms-rooms-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => {
          onRoomUpdate?.();
        }
      )
      .subscribe();

    const resChannel = supabase
      .channel("pms-reservations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          onReservationUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(resChannel);
    };
  }, [onRoomUpdate, onReservationUpdate]);
}
