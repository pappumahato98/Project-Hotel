import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// ============= Types =============
export interface OTAChannel {
  id: string;
  name: string;
  code: string;
  api_endpoint: string | null;
  is_active: boolean;
  commission_rate: number;
  last_sync_at: string | null;
  sync_status: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface RateAvailability {
  id: string;
  room_id: string;
  date: string;
  available_count: number;
  rate: number;
  min_stay: number;
  max_stay: number | null;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  created_at: string;
  room?: { room_number: string; room_type: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= OTA Channels =============
export function useOTAChannels() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ota-channels"],
    queryFn: async () => {
      const { data, error } = await db
        .from("ota_channels")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as OTAChannel[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("ota-channels-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ota_channels" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ota-channels"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateChannel = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OTAChannel> & { id: string }) => {
      const { data, error } = await db.from("ota_channels").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ota-channels"] }),
  });

  const toggleChannel = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await db.from("ota_channels").update({ is_active: isActive }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ota-channels"] }),
  });

  const syncChannel = useMutation({
    mutationFn: async (id: string) => {
      // Simulate sync - in real app, this would call an API
      const { data, error } = await db
        .from("ota_channels")
        .update({ last_sync_at: new Date().toISOString(), sync_status: "success" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ota-channels"] }),
  });

  return { ...query, updateChannel, toggleChannel, syncChannel };
}

// ============= Rate Availability =============
export function useRateAvailability(filters?: { roomId?: string; startDate?: string; endDate?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rate-availability", filters],
    queryFn: async () => {
      let q = db
        .from("rate_availability")
        .select(`*, room:rooms(room_number, room_type)`)
        .order("date");

      if (filters?.roomId) q = q.eq("room_id", filters.roomId);
      if (filters?.startDate) q = q.gte("date", filters.startDate);
      if (filters?.endDate) q = q.lte("date", filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data as RateAvailability[];
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ roomId, date, ...updates }: { roomId: string; date: string } & Partial<Omit<RateAvailability, "id" | "room_id" | "date" | "room">>) => {
      const { data, error } = await db
        .from("rate_availability")
        .upsert({ room_id: roomId, date, ...updates }, { onConflict: "room_id,date" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-availability"] }),
  });

  const bulkUpdateRates = useMutation({
    mutationFn: async (updates: { roomId: string; startDate: string; endDate: string; rate?: number; availableCount?: number; minStay?: number; closedToArrival?: boolean; closedToDeparture?: boolean }) => {
      const dates: string[] = [];
      const start = new Date(updates.startDate);
      const end = new Date(updates.endDate);
      
      for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }

      const records = dates.map((date) => ({
        room_id: updates.roomId,
        date,
        ...(updates.rate !== undefined && { rate: updates.rate }),
        ...(updates.availableCount !== undefined && { available_count: updates.availableCount }),
        ...(updates.minStay !== undefined && { min_stay: updates.minStay }),
        ...(updates.closedToArrival !== undefined && { closed_to_arrival: updates.closedToArrival }),
        ...(updates.closedToDeparture !== undefined && { closed_to_departure: updates.closedToDeparture }),
      }));

      const { error } = await db.from("rate_availability").upsert(records, { onConflict: "room_id,date" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-availability"] }),
  });

  return { ...query, updateRate, bulkUpdateRates };
}

// ============= Channel Stats =============
export function useChannelStats() {
  const { data: channels } = useOTAChannels();

  return {
    totalChannels: channels?.length || 0,
    activeChannels: channels?.filter((c) => c.is_active).length || 0,
    avgCommission: channels?.reduce((sum, c) => sum + c.commission_rate, 0) / (channels?.length || 1) || 0,
    lastSync: channels?.filter((c) => c.last_sync_at).sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0]?.last_sync_at || null,
  };
}
