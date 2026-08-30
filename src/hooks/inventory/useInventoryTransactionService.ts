import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db, updateStoreStock, getInventoryAccount, createFinanceEntry, convertUoM } from "./utils";
import { StockMovement, InventoryTransfer, InventoryWastage } from "@/types/inventory";

export function useStockMovements(itemId?: string) {
  return useQuery({
    queryKey: ["stock-movements", itemId],
    queryFn: async () => {
      let q = db
        .from("stock_movements")
        .select(`*, item:inventory_items(name, sku, department, cost_price, avg_cost)`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (itemId) q = q.eq("item_id", itemId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as StockMovement[];
    },
  });
}

export function useInventoryTransfers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-transfers"],
    queryFn: async () => {
      try {
        const { data, error } = await db
          .from("inventory_transfers")
          .select(`*, item:inventory_items(name, item_code, unit), from_store:inventory_stores!from_store_id(store_name), to_store:inventory_stores!to_store_id(store_name)`)
          .order("created_at", { ascending: false });

        if (error && (error.message.includes("item_code") || error.message.includes("inventory_stores") || error.message.includes("store_name"))) {
           const legacy = await db.from("inventory_transfers").select(`*, item:inventory_items(id, name, sku, unit)`).order("created_at", { ascending: false });
           return (legacy.data || []).map((t: any) => ({
             ...t,
             item: t.item ? { ...t.item, item_code: t.item.item_code || t.item.sku } : undefined
           })) as any[];
        }
        if (error) throw error;
        return (data || []).map((t: any) => ({
           ...t,
           from_store: t.from_store ? { name: (t.from_store as any).store_name } : undefined,
           to_store: t.to_store ? { name: (t.to_store as any).store_name } : undefined
        })) as InventoryTransfer[];
      } catch (e) {
        return [];
      }
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("inventory-transfers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_transfers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createTransfer = useMutation({
    mutationFn: async (transfer: Partial<InventoryTransfer>) => {
      const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await db.from("inventory_transfers").insert({ ...transfer, transfer_number: transferNumber, status: "pending" } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] }),
  });

  const completeTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { data: transfer, error: fetchErr } = await db.from("inventory_transfers").select("*").eq("id", id).single();
      if (fetchErr) throw fetchErr;

      await db.from("stock_movements").insert({
        item_id: transfer.item_id,
        movement_type: "transfer",
        quantity: transfer.quantity,
        store_id: transfer.from_store_id,
        notes: `Transfer OUT to ${transfer.to_store_id}`,
      });

      if (transfer.from_store_id) await updateStoreStock(transfer.item_id, transfer.from_store_id, transfer.quantity, 'decrement');
      if (transfer.to_store_id) await updateStoreStock(transfer.item_id, transfer.to_store_id, transfer.quantity, 'increment');

      const { error } = await db.from("inventory_transfers").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  const cancelTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventory_transfers").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] }),
  });

  return { ...query, createTransfer, completeTransfer, cancelTransfer };
}

export function useInventoryWastage() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-wastage"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_wastage")
        .select(`*, item:inventory_items(name, sku, unit, cost_price, avg_cost)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InventoryWastage[];
    },
  });

  const reportWastage = useMutation({
    mutationFn: async (wastage: Partial<InventoryWastage>) => {
      const { data, error } = await db.from("inventory_wastage").insert(wastage as any).select().single();
      if (error) throw error;

      const { data: item, error: fetchErr } = await db.from("inventory_items").select("current_stock, cost_price, avg_cost").eq("id", wastage.item_id as string).single();
      if (fetchErr) throw fetchErr;

      await db.from("inventory_items").update({ current_stock: Math.max(0, item.current_stock - (wastage.quantity || 0)) }).eq("id", wastage.item_id);
      await db.from("stock_movements").insert({
        item_id: wastage.item_id,
        movement_type: "out",
        quantity: wastage.quantity,
        notes: `Wastage: ${wastage.wastage_type} - ${wastage.reason || "No reason"}`,
      });

      const assetAcc = await getInventoryAccount('inventory_gl_account');
      const wasteAcc = await getInventoryAccount('wastage_gl_account');
      const impactValue = (wastage.quantity || 0) * (item?.avg_cost || item?.cost_price || 0);

      await createFinanceEntry(`Inventory Wastage: ${wastage.wastage_type}`, [
         { account_id: wasteAcc, debit: impactValue, credit: 0 },
         { account_id: assetAcc, debit: 0, credit: impactValue }
      ]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-wastage"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  return { ...query, reportWastage };
}
