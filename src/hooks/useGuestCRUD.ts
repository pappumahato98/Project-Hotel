import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface GuestUpdate {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  is_vip?: boolean | null;
  notes?: string | null;
}

export function useGuestCRUD() {
  const queryClient = useQueryClient();

  const createGuest = useMutation({
    mutationFn: async (guest: Omit<GuestUpdate, "id">) => {
      const { data, error } = await db
        .from("guests")
        .insert({ ...guest, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success("Guest created successfully");
    },
    onError: (e: Error) => toast.error("Failed to create guest: " + e.message),
  });

  const updateGuest = useMutation({
    mutationFn: async ({ id, ...updates }: GuestUpdate) => {
      const { data, error } = await db
        .from("guests")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
      toast.success("Guest updated successfully and synced across modules");
    },
    onError: (e: Error) => toast.error("Failed to update guest: " + e.message),
  });

  const deleteGuest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("guests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success("Guest deleted");
    },
    onError: (e: Error) => toast.error("Failed to delete guest: " + e.message),
  });

  const toggleVIP = useMutation({
    mutationFn: async (params: { id: string; is_vip: boolean }) => {
      const { data, error } = await db
        .from("guests")
        .update({ is_vip: params.is_vip })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, vars: { id: string; is_vip: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success(vars.is_vip ? "Guest marked as VIP" : "VIP status removed");
    },
  });

  return { createGuest, updateGuest, deleteGuest, toggleVIP };
}
