import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url?: string | null;
  address: string | null;
  total_visits: number | null;
  total_spending: number | null;
  is_vip: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useGuests = () => {
  return useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Guest[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useGuest = (guestId: string | null) => {
  return useQuery({
    queryKey: ["guest", guestId],
    queryFn: async () => {
      if (!guestId) return null;
      
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("id", guestId)
        .single();

      if (error) throw error;
      return data as Guest;
    },
    enabled: !!guestId,
  });
};
