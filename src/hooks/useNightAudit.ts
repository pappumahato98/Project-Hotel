import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO } from "date-fns";
import { useGuestFolios } from "@/hooks/useGuestFolios";

export const useNightAudit = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Business Date
  const { data: businessDate, isLoading: isDateLoading } = useQuery({
    queryKey: ["settings", "business_date"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("settings")
        .select("value")
        .eq("key", "business_date")
        .single();

      if (error) throw error;
      return (data.value as string); // Expected format: "YYYY-MM-DD"
    },
  });

  // 2. Fetch Pending Arrivals for the current business date
  const usePendingArrivals = (date: string) => useQuery({
    queryKey: ["reservations", "pending", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          guests (first_name, last_name)
        `)
        .eq("check_in_date", date)
        .eq("status", "confirmed");

      if (error) throw error;
      return data;
    },
    enabled: !!date
  });

  // 3. Fetch Stay-overs (already checked in)
  const useStayOvers = (date: string) => useQuery({
    queryKey: ["reservations", "stayovers", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          guests (first_name, last_name),
          rooms (room_number, price_per_night)
        `)
        .eq("status", "checked-in")
        .lte("check_in_date", date)
        .gt("check_out_date", date);

      if (error) throw error;
      return data;
    },
    enabled: !!date
  });

  // 4. Mutation: Post Daily Room Charges
  const { postRoomCharges } = useGuestFolios();
  const postCharges = useMutation({
    mutationFn: async (date: string) => {
      const result = await postRoomCharges.mutateAsync({ businessDate: date });
      // useGuestFolios.postRoomCharges returns { count }, useNightAudit expects { posted_count, total_revenue }
      // Let's align them to return full stats in useGuestFolios
      return { posted_count: result.count, total_revenue: result.totalRevenue || 0 };
    }
  });

  // 5. Mutation: Close Day & Increment Business Date
  const closeDay = useMutation({
    mutationFn: async ({ currentDate, log }: { currentDate: string, log: {
      total_charges_posted: number;
      total_room_revenue: number;
      occupancy_rate: number;
    } }) => {
      const nextDate = format(addDays(parseISO(currentDate), 1), "yyyy-MM-dd");

      // Update business date in settings
      const { error: settingsError } = await (supabase as any)
        .from("settings")
        .update({ value: nextDate })
        .eq("key", "business_date");

      if (settingsError) throw settingsError;

      // Create Audit Log
      const { error: logError } = await (supabase as any)
        .from("night_audit_logs")
        .insert([{
          business_date: currentDate,
          ...log,
          status: 'completed'
        }]);

      if (logError) throw logError;

      return nextDate;
    },
    onSuccess: (nextDate) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "business_date"] });
      toast({
        title: "Day Closed Successfully",
        description: `Business date is now ${nextDate}.`,
      });
    }
  });

  return {
    businessDate,
    isDateLoading,
    usePendingArrivals,
    useStayOvers,
    postCharges,
    closeDay
  };
};
