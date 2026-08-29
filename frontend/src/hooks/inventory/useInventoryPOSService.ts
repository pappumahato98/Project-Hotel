import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db, convertUoM, updateStoreStock } from "./utils";

export function useInventoryPOS() {
  const queryClient = useQueryClient();

  const deductBulkInventoryForSale = useMutation({
    mutationFn: async ({ saleId, items, storeId }: { saleId: string, items: { menu_item_id: string, quantity: number }[], storeId?: string }) => {
      const { data: recipes } = await db.from("inventory_recipes").select("id, menu_item_id").in("menu_item_id", items.map(i => i.menu_item_id)).eq("is_active", true);

      if (!recipes || recipes.length === 0) return;

      for (const item of items) {
        const recipe = recipes.find(r => r.menu_item_id === item.menu_item_id);
        if (recipe) {
          const { data: recipeItems } = await db.from("inventory_recipe_items").select("*").eq("recipe_id", recipe.id);
          if (recipeItems) {
            for (const rItem of recipeItems) {
              const { data: invItem } = await db.from("inventory_items").select("current_stock, uom_id").eq("id", rItem.item_id).single();
              let deductionQty = rItem.quantity * item.quantity;
              if (rItem.uom_id && invItem?.uom_id && rItem.uom_id !== invItem.uom_id) {
                 deductionQty = await convertUoM(rItem.uom_id, invItem.uom_id, deductionQty);
              }
              await db.from("inventory_items").update({ current_stock: Math.max(0, (invItem?.current_stock || 0) - deductionQty) }).eq("id", rItem.item_id);
              if (storeId) await updateStoreStock(rItem.item_id, storeId, deductionQty, 'decrement');
              await db.from("stock_movements").insert({
                item_id: rItem.item_id,
                movement_type: "out",
                quantity: deductionQty,
                reference_type: "pos_sale",
                reference_id: saleId,
                notes: `POS Sale deduction (Menu Item: ${item.menu_item_id})`,
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  return { deductBulkInventoryForSale };
}
