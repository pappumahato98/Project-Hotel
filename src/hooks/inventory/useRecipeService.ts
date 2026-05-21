import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db, updateStoreStock, convertUoM } from "./utils";
import { InventoryRecipe, InventoryRecipeItem } from "@/types/inventory";

export function useInventoryRecipes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-recipes"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_recipes")
        .select(`*, items:inventory_recipe_items(*, item:inventory_items(*), uom:inventory_uoms(*))`)
        .order("name");
      if (error) throw error;
      return data as unknown as InventoryRecipe[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("inventory-recipes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_recipes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inventory-recipes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createRecipe = useMutation({
    mutationFn: async ({ items, ...recipe }: { items: Partial<InventoryRecipeItem>[], name: string, description?: string, portion_size?: string, yield_percentage?: number }) => {
      const { data: rec, error: recError } = await db.from("inventory_recipes").insert(recipe as any).select().single();
      if (recError) throw recError;

      const recItems = items.map((i) => ({ ...i, recipe_id: rec.id }));
      const { error: itemsError } = await db.from("inventory_recipe_items").insert(recItems as any);
      if (itemsError) throw itemsError;
      return rec;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-recipes"] }),
  });

  return { ...query, createRecipe };
}

export function useInventoryProduction() {
  const queryClient = useQueryClient();

  const produceBatch = useMutation({
    mutationFn: async ({ recipeId, quantity, producedBy, notes, storeId }: { recipeId: string, quantity: number, producedBy: string, notes?: string, storeId?: string }) => {
      const { data: log, error: logErr } = await db.from("inventory_production_logs").insert({
        recipe_id: recipeId,
        quantity_produced: quantity,
        produced_by: producedBy,
        notes
      } as any).select().single();
      if (logErr) throw logErr;

      const { data: recipeItems } = await db.from("inventory_recipe_items").select("*").eq("recipe_id", recipeId);

      if (recipeItems) {
        for (const rItem of recipeItems) {
          const { data: invItem } = await db.from("inventory_items").select("current_stock, uom_id, cost_price, avg_cost").eq("id", rItem.item_id).single();

          let deductionQty = rItem.quantity * quantity;
          if (rItem.uom_id && invItem?.uom_id && rItem.uom_id !== invItem.uom_id) {
             deductionQty = await convertUoM(rItem.uom_id, invItem.uom_id, deductionQty);
          }

          await db.from("inventory_items").update({
            current_stock: Math.max(0, (invItem?.current_stock || 0) - deductionQty)
          }).eq("id", rItem.item_id);

          if (storeId) {
             await updateStoreStock(rItem.item_id, storeId, deductionQty, 'decrement');
          }

          await db.from("stock_movements").insert({
            item_id: rItem.item_id,
            movement_type: "out",
            quantity: deductionQty,
            reference_type: "production",
            reference_id: (log as any).id as string,
            notes: `Production consumption for Recipe ID ${recipeId}`,
          });
        }
      }

      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  return { produceBatch };
}
