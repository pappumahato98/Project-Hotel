import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import { db, updateStoreStock, getInventoryAccount, createFinanceEntry } from "./utils";
import { useInventoryItems } from "./useItemService";
import { useStockMovements } from "./useInventoryTransactionService";
import { InventoryStockCount, InventorySupplierReturnItem, InventorySupplierReturn } from "@/types/inventory";

export function useInventoryStats() {
  const notifiedRefs = useRef<Set<string>>(new Set());
  const { data: items } = useInventoryItems();
  const { data: movements } = useStockMovements();
  const { data: stockCounts } = useInventoryStockCounts();
  const { data: purchaseItems } = useQuery({
    queryKey: ["all-purchase-items"],
    queryFn: async () => {
      const { data } = await db.from("purchase_order_items").select("*, purchase_order:purchase_orders!inner(status, order_date)").eq("purchase_order.status", "received");
      return (data || []) as any[];
    }
  });

  const calculateValuation = () => {
    if (!items) return 0;
    return items.reduce((sum, i) => sum + i.current_stock * (i.avg_cost || i.cost_price), 0);
  };

  const calculateVariance = () => {
    if (!stockCounts || stockCounts.length === 0) return 0;
    const latestCount = stockCounts[0];
    return latestCount.items?.reduce((sum, i) => sum + Math.abs(i.variance), 0) || 0;
  };

  return {
    totalItems: items?.length || 0,
    lowStock: items?.filter((i) => i.current_stock <= i.reorder_point).length || 0,
    outOfStock: items?.filter((i) => i.current_stock === 0).length || 0,
    totalValue: calculateValuation(),
    stockVariance: calculateVariance(),
  };
}

export function useInventoryStockCounts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-stock-counts"],
    queryFn: async () => {
      try {
        let { data, error } = await db
          .from("inventory_stock_counts")
          .select(`*, store:inventory_stores(*), items:inventory_stock_count_items(*, item:inventory_items(*))`)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as InventoryStockCount[];
      } catch (e) {
        return [];
      }
    },
  });

  const reconcileCount = useMutation({
    mutationFn: async (id: string) => {
      const { data: countItems } = await db.from('inventory_stock_count_items').select('*, item:inventory_items(cost_price, avg_cost, name)').eq('stock_count_id', id);
      let totalVarianceValue = 0;
      const { data: master } = await db.from('inventory_stock_counts').select('store_id').eq('id', id).single();

      if (countItems) {
        for (const cItem of countItems) {
          const variance = cItem.counted_quantity - cItem.system_quantity;
          if (variance !== 0) {
            totalVarianceValue += (variance * (cItem.item?.avg_cost || cItem.item?.cost_price || 0));
            await db.from('inventory_items').update({ current_stock: cItem.counted_quantity }).eq('id', cItem.item_id);
            if (master?.store_id) {
               await updateStoreStock(cItem.item_id, master.store_id, cItem.counted_quantity, 'set');
            }
            await db.from('stock_movements').insert({
              item_id: cItem.item_id,
              movement_type: 'adjustment',
              quantity: Math.abs(variance),
              notes: `Audit reconciliation: ${variance > 0 ? '+' : ''}${variance}`
            });
          }
        }
      }

      const assetAcc = await getInventoryAccount('inventory_gl_account');
      const adjAcc = await getInventoryAccount('adjustment_gl_account');

      if (totalVarianceValue !== 0) {
         await createFinanceEntry(`Stock Count Reconciliation`, [
            { account_id: assetAcc, debit: totalVarianceValue > 0 ? totalVarianceValue : 0, credit: totalVarianceValue < 0 ? Math.abs(totalVarianceValue) : 0 },
            { account_id: adjAcc, debit: totalVarianceValue < 0 ? Math.abs(totalVarianceValue) : 0, credit: totalVarianceValue > 0 ? totalVarianceValue : 0 }
         ]);
      }
      await db.from('inventory_stock_counts').update({ status: 'reconciled' }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-stock-counts"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });

  return { ...query, reconcileCount };
}

export function useStockByStore() {
  return useQuery({
    queryKey: ["stock-by-store"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_item_stores")
        .select(`
          *,
          store:inventory_stores(name, code, location),
          item:inventory_items(name, sku, category, unit, cost_price)
        `)
        .gt("current_stock", 0)
        .order("store_id");

      if (error) {
        console.error("Error fetching stock by store:", error);
        return [];
      }
      return data as any[];
    }
  });
}
