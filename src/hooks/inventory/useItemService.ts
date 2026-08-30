import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db, getInventoryAccount, createFinanceEntry, updateStoreStock } from "./utils";
import { InventoryItem } from "@/types/inventory";

export function useInventoryItems(filters?: { category?: string; lowStock?: boolean; storeId?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-items", filters],
    queryFn: async () => {
      let q = db
        .from("inventory_items")
        .select(`id, name, sku, item_code, item_type, attributes, avg_cost, safety_stock, category_id, supplier_id, unit, current_stock, min_stock, max_stock, reorder_point, cost_price, selling_price, location, department, is_active, last_restocked_at, created_at, category:inventory_categories(id, name, category_name, parent_id, parent_category), supplier:suppliers(*), uom:inventory_uoms(*)`)
        .eq("is_active", true);

      let { data, error } = await (q as any);

      if (error && (error.message.includes("attributes") || error.message.includes("item_code") || error.message.includes("avg_cost") || error.message.includes("item_type"))) {
        console.warn("Detected missing columns in inventory_items, falling back to minimal select");
        const fallback = await (db
          .from("inventory_items")
          .select(`id, name, sku, category_id, supplier_id, unit, current_stock, min_stock, max_stock, reorder_point, cost_price, selling_price, location, department, is_active, last_restocked_at, created_at, category:inventory_categories(id, name), supplier:suppliers(id, name)`)
          .eq("is_active", true) as any);
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      let items = data as InventoryItem[];
      if (filters?.lowStock) items = items.filter((i) => i.current_stock <= i.reorder_point);
      return items;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("inventory-items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createItem = useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      const { category: _c, supplier: _s, uom: _u, ...clean } = item as Record<string, unknown>;
      const { data, error } = await db.from("inventory_items").insert(clean as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { category: _c, supplier: _s, uom: _u, ...clean } = updates as Record<string, unknown>;
      const { data, error } = await db.from("inventory_items").update(clean as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });

  const deactivateItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventory_items").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });

  const adjustStock = useMutation({
    mutationFn: async ({ itemId, storeId, quantity, type, notes, reason }: { itemId: string; storeId?: string; quantity: number; type: "in" | "out" | "adjustment"; notes?: string, reason?: string }) => {
      const { data: item, error: fetchError } = await db.from("inventory_items").select("name, current_stock, cost_price, avg_cost").eq("id", itemId).single();
      if (fetchError) throw fetchError;

      const newStock = type === "out" ? item.current_stock - quantity : item.current_stock + quantity;
      const updates: Record<string, unknown> = { current_stock: Math.max(0, newStock) };
      if (type === "in") updates.last_restocked_at = new Date().toISOString();

      const { error: updateError } = await db.from("inventory_items").update(updates).eq("id", itemId);
      if (updateError) throw updateError;

      const { error: movementError } = await db.from("stock_movements").insert({
        item_id: itemId,
        store_id: storeId,
        movement_type: type,
        quantity,
        reference_type: 'manual_adjustment',
        notes: `${reason || 'Adjustment'}: ${notes || ''}`.trim()
      });
      if (movementError) throw movementError;

      if (storeId) {
         await updateStoreStock(itemId, storeId, quantity, type === 'out' ? 'decrement' : 'increment');
      }

      const assetAcc = await getInventoryAccount('inventory_gl_account');
      let offsetAcc = await getInventoryAccount('adjustment_gl_account');
      if (reason === 'Damage' || reason === 'Expiry') {
         offsetAcc = await getInventoryAccount('wastage_gl_account');
      } else if (reason === 'Theft' || reason === 'Loss') {
         offsetAcc = await getInventoryAccount('wastage_gl_account');
      }

      const impactValue = quantity * (item.avg_cost || item.cost_price);

      await createFinanceEntry(`Inv. Adj (${reason || 'Other'}): ${item.name}`, [
         { account_id: assetAcc, debit: type === 'in' ? impactValue : 0, credit: type === 'out' ? impactValue : 0 },
         { account_id: offsetAcc, debit: type === 'out' ? impactValue : 0, credit: type === 'in' ? impactValue : 0 }
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  return { ...query, createItem, updateItem, deactivateItem, adjustStock };
}
