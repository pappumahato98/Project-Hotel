import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FixedAsset {
  id: string;
  asset_number: string;
  name: string;
  category: string;
  description: string | null;
  acquisition_date: string;
  cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  location: string | null;
  status: string;
  disposed_date: string | null;
  disposal_amount: number | null;
  account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

export function useFixedAssets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["fixed-assets"],
    queryFn: async () => {
      const { data, error } = await db
        .from("fixed_assets")
        .select("*")
        .order("asset_number");
      if (error) throw error;
      return data as FixedAsset[];
    },
  });

  const createAsset = useMutation({
    mutationFn: async (asset: Omit<FixedAsset, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db.from("fixed_assets").insert(asset).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fixed-assets"] }),
  });

  const updateAsset = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FixedAsset> & { id: string }) => {
      const { data, error } = await db.from("fixed_assets").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fixed-assets"] }),
  });

  // Calculate monthly depreciation for an asset
  const calculateDepreciation = (asset: FixedAsset): number => {
    if (asset.depreciation_method === "straight_line") {
      return (asset.cost - asset.salvage_value) / asset.useful_life_months;
    }
    // Declining balance: 2x straight-line rate applied to remaining book value
    const straightLineRate = 1 / asset.useful_life_months;
    const bookValue = asset.cost - asset.accumulated_depreciation;
    return bookValue * straightLineRate * 2;
  };

  // Run depreciation for all active assets
  const runDepreciation = useMutation({
    mutationFn: async () => {
      const { data: assets, error } = await db
        .from("fixed_assets")
        .select("*")
        .eq("status", "active");
      if (error) throw error;

      for (const asset of assets || []) {
        const monthlyDep = calculateDepreciation(asset);
        const newAccum = Math.min(
          asset.accumulated_depreciation + monthlyDep,
          asset.cost - asset.salvage_value
        );
        await db
          .from("fixed_assets")
          .update({ accumulated_depreciation: newAccum })
          .eq("id", asset.id);
      }
      return assets?.length || 0;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fixed-assets"] }),
  });

  return { ...query, createAsset, updateAsset, runDepreciation, calculateDepreciation };
}
