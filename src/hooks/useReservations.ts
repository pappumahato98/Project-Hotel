import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface Reservation {
  id: string;
  reservation_code: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  payment_status: string | null;
  total_amount: number;
  amount_paid: number | null;
  adults: number;
  children: number | null;
  source: string | null;
  special_requests: string | null;
  actual_check_in: string | null;
  actual_check_out: string | null;
  late_check_out: boolean | null;
  is_complimentary: boolean | null;
  is_upgrade: boolean | null;
  market_segment: string | null;
  created_at: string;
  guest_id: string;
  room_id: string;
  guest: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    is_vip: boolean | null;
    notes: string | null;
  } | null;
  room: {
    room_number: string;
    room_type: string;
    price_per_night: number;
    floor: number;
  } | null;
}

async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      id,
      reservation_code,
      check_in_date,
      check_out_date,
      status,
      payment_status,
      total_amount,
      amount_paid,
      adults,
      children,
      source,
      special_requests,
      actual_check_in,
      actual_check_out,
      late_check_out,
      is_complimentary,
      is_upgrade,
      market_segment,
      created_at,
      guest_id,
      room_id,
      guest:guests(first_name, last_name, email, phone, is_vip, notes),
      room:rooms(room_number, room_type, price_per_night, floor)
    `)
    .order("check_in_date", { ascending: false });

  if (error) throw error;
  return data as unknown as Reservation[];
}

export const useReservations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: reservations = [], isLoading, error, refetch } = useQuery({
    queryKey: ["reservations"],
    queryFn: fetchReservations,
    staleTime: 1000 * 60 * 3,
  });

  // Helper function to invalidate ALL reservation-related queries (must be before useEffect)
  const invalidateAllReservationQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
    queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["housekeeping-tasks"] });
    // Invalidate Night Audit query keys
    queryClient.invalidateQueries({ queryKey: ["reservations", "pending"] });
    queryClient.invalidateQueries({ queryKey: ["reservations", "stayovers"] });
    // Invalidate report stats
    queryClient.invalidateQueries({ queryKey: ["report-stats"] });
  }, [queryClient]);

  // Realtime subscription for reservations
  useEffect(() => {
    const channel = supabase
      .channel("frontdesk-reservations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          invalidateAllReservationQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, invalidateAllReservationQueries]);

  const filterReservations = useCallback(
    (query: string) => {
      if (!query) return reservations;
      const searchLower = query.toLowerCase();
      return reservations.filter(
        (res) =>
          res.reservation_code.toLowerCase().includes(searchLower) ||
          `${res.guest?.first_name} ${res.guest?.last_name}`
            .toLowerCase()
            .includes(searchLower) ||
          res.room?.room_number.toLowerCase().includes(searchLower)
      );
    },
    [reservations]
  );

  const updateReservation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("reservations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllReservationQueries();
      toast({ title: "Reservation updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelReservation = useMutation({
    mutationFn: async (id: string) => {
      const { data: res } = await supabase
        .from("reservations")
        .select("room_id")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;

      // Free up the room if it was occupied
      if (res?.room_id) {
        await supabase.from("rooms").update({ status: "available" }).eq("id", res.room_id);
      }
    },
    onSuccess: () => {
      invalidateAllReservationQueries();
      toast({ title: "Reservation cancelled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markNoShow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "no-show" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllReservationQueries();
      toast({ title: "Reservation marked as no-show" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    reservations,
    isLoading,
    error: error as Error | null,
    refetch,
    filterReservations,
    updateReservation,
    cancelReservation,
    markNoShow,
  };
};
