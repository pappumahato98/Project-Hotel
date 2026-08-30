import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db } from "./utils";
import { InventoryCategory, InventoryUoM, InventoryUoMConversion } from "@/types/inventory";

export function useInventorySettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("inventory_settings").select("*");
      if (error) throw error;
      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => settingsMap[s.setting_key] = s.setting_value);
      return settingsMap;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      for (const [key, value] of Object.entries(updates)) {
        await db.from("inventory_settings").upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-settings"] }),
  });

  return { ...query, updateSettings };
}

export function useInventoryCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: async () => {
      const { data, error } = await db.from("inventory_categories").select("*").order("name");
      if (error) throw error;
      return data as InventoryCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (cat: { name: string; description?: string; parent_id?: string; sku_prefix?: string }) => {
      const { data, error } = await db.from("inventory_categories").insert(cat as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; description?: string | null; parent_id?: string | null; sku_prefix?: string | null }) => {
      const { data, error } = await db.from("inventory_categories").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventory_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });

  return { ...query, createCategory, updateCategory, deleteCategory };
}

export function useInventoryUoMs() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-uoms"],
    queryFn: async () => {
      try {
        const { data, error } = await db.from("inventory_uoms").select("*").order("name");
        if (error) {
          console.warn("inventory_uoms table not available:", error.message);
          return [];
        }
        return data as InventoryUoM[];
      } catch (e) {
        console.warn("inventory_uoms query failed:", e);
        return [];
      }
    },
    retry: 1,
  });

  const conversionsQuery = useQuery({
    queryKey: ["inventory-uom-conversions"],
    queryFn: async () => {
      try {
        const { data, error } = await db
          .from("inventory_uom_conversions")
          .select("*, from_uom:inventory_uoms!from_uom_id(name, abbreviation), to_uom:inventory_uoms!to_uom_id(name, abbreviation)");
        if (error) {
          console.warn("inventory_uom_conversions table not available:", error.message);
          return [];
        }
        return data as InventoryUoMConversion[];
      } catch (e) {
        console.warn("inventory_uom_conversions query failed:", e);
        return [];
      }
    },
    retry: 1,
  });

  const createUoM = useMutation({
    mutationFn: async (uom: { name: string; abbreviation?: string }) => {
      const { data, error } = await db.from("inventory_uoms").insert(uom as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-uoms"] }),
  });

  const createConversion = useMutation({
    mutationFn: async (conv: { from_uom_id: string; to_uom_id: string; conversion_factor: number }) => {
      const { data, error } = await db.from("inventory_uom_conversions").insert(conv as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-uom-conversions"] }),
  });

  const updateUoM = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; abbreviation?: string; is_base?: boolean }) => {
      const { data, error } = await db.from("inventory_uoms").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-uoms"] }),
  });

  const deleteUoM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventory_uoms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-uoms"] }),
  });

  const deleteConversion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventory_uom_conversions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-uom-conversions"] }),
  });

  return {
    ...query,
    conversions: conversionsQuery.data || [],
    isConversionsLoading: conversionsQuery.isLoading,
    createUoM,
    updateUoM,
    deleteUoM,
    createConversion,
    deleteConversion
  };
}
