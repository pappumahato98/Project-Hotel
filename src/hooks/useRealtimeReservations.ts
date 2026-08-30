import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UseRealtimeReservationsOptions {
  onInsert?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  showToasts?: boolean;
}

export function useRealtimeReservations(options: UseRealtimeReservationsOptions = {}) {
  const { user } = useAuth();
  const { onInsert, onUpdate, onDelete, showToasts = true } = options;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("reservations-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reservations",
        },
        (payload) => {
          onInsert?.();
          if (showToasts) {
            const reservation = payload.new as { reservation_code?: string };
            toast.success("New Reservation", {
              description: `Booking ${reservation.reservation_code || "created"} has been added.`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reservations",
        },
        (payload) => {
          onUpdate?.();
          if (showToasts) {
            const reservation = payload.new as { reservation_code?: string; status?: string };
            toast.info("Reservation Updated", {
              description: `Booking ${reservation.reservation_code || ""} status: ${reservation.status || "updated"}.`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "reservations",
        },
        () => {
          onDelete?.();
          if (showToasts) {
            toast.warning("Reservation Deleted", {
              description: "A reservation has been removed.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onInsert, onUpdate, onDelete, showToasts]);
}
