import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db } from "./utils";
import { InventoryStore } from "@/types/inventory";

export function useInventoryStores() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-stores"],
    queryFn: async () => {
      const { data, error } = await db.from("inventory_stores").select("*").order("name");
      if (error) throw error;
      return data as InventoryStore[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("inventory-stores-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_stores" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inventory-stores"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createStore = useMutation({
    mutationFn: async (store: Omit<InventoryStore, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db.from("inventory_stores").insert(store as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-stores"] }),
  });

  const updateStore = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryStore> & { id: string }) => {
      const { data, error } = await db.from("inventory_stores").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-stores"] }),
  });

  return { ...query, createStore, updateStore };
}
