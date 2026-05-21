import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  price_per_night: number;
  status: string;
  amenities: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("room_number", { ascending: true });

      if (error) throw error;
      return data as Room[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useRoomsMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addRoom = useMutation({
    mutationFn: async (room: Omit<Room, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("rooms")
        .insert([room])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Success", description: "Room added to inventory" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateRoom = useMutation({
    mutationFn: async (room: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from("rooms")
        .update({ ...room, updated_at: new Date().toISOString() })
        .eq("id", room.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Success", description: "Room updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Success", description: "Room deleted from inventory" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return { addRoom, updateRoom, deleteRoom };
};

export const useRoom = (roomId: string | null) => {
  return useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      if (!roomId) return null;
      
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) throw error;
      return data as Room;
    },
    enabled: !!roomId,
  });
};

export const useRoomStats = () => {
  const { data: rooms, isLoading, error } = useRooms();

  const stats = rooms?.reduce(
    (acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  return {
    stats: {
      available: stats["available"] || 0,
      occupied: stats["occupied"] || 0,
      cleaning: stats["cleaning"] || 0,
      maintenance: stats["maintenance"] || 0,
    },
    isLoading,
    error,
  };
};
