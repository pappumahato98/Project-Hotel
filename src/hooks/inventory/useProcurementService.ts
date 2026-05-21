import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db, updateStoreStock, getInventoryAccount, createFinanceEntry } from "./utils";
import { PurchaseOrder, PurchaseOrderItem, InventorySupplierReturn, InventorySupplierReturnItem, Supplier, SupplierContract, SupplierPricing } from "@/types/inventory";

export function useSuppliers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await db.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("suppliers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createSupplier = useMutation({
    mutationFn: async (supplier: Partial<Supplier>) => {
      const { data, error } = await db.from("suppliers").insert(supplier as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await db.from("suppliers").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  return { ...query, createSupplier, updateSupplier };
}

export function usePurchaseOrders(status?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["purchase-orders", status],
    queryFn: async () => {
      let q = db
        .from("purchase_orders")
        .select(`*, supplier:suppliers(*), items:purchase_order_items(*, item:inventory_items(*, uom:inventory_uoms(*)))`)
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });

  const createPurchaseOrder = useMutation({
    mutationFn: async ({ items, ...order }: { items: Partial<PurchaseOrderItem>[], supplier_id: string | null, status: string, order_date: string, subtotal: number, tax_amount: number, total: number, notes?: string, expected_delivery?: string | null }) => {
      const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
      const { data: po, error: poError } = await db.from("purchase_orders").insert({ ...order, order_number: orderNumber } as any).select().single();
      if (poError) throw poError;

      const poItems = items.map((i) => ({ ...i, purchase_order_id: po.id }));
      const { error: itemsError } = await db.from("purchase_order_items").insert(poItems as any);
      if (itemsError) throw itemsError;
      return po;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });

  const updatePurchaseOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await db.from("purchase_orders").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });

  const receivePurchaseOrder = useMutation({
    mutationFn: async ({ poId, receivedItems, storeId }: { poId: string; receivedItems: { poItemId: string, itemId: string, receivedQty: number, batchNumber?: string, expiryDate?: string, damagedQty?: number, qualityStatus?: string }[]; storeId?: string }) => {
      let totalValueReceived = 0;
      for (const ri of receivedItems) {
        const { error: poItemErr } = await db.from("purchase_order_items").update({
          received_quantity: ri.receivedQty,
          batch_number: ri.batchNumber,
          expiry_date: ri.expiryDate,
          damaged_quantity: ri.damagedQty,
          quality_status: ri.qualityStatus
        } as any).eq("id", ri.poItemId);

        if (poItemErr) throw poItemErr;

        if (ri.receivedQty > 0) {
          const { data: item, error: fetchErr } = await db.from("inventory_items").select("name, current_stock, cost_price, avg_cost, reorder_point").eq("id", ri.itemId).single();
          if (fetchErr) throw fetchErr;

          const { data: poItem } = await db.from("purchase_order_items").select("unit_price").eq("id", ri.poItemId).single();
          const unitPrice = (poItem as any)?.unit_price || item.cost_price;
          totalValueReceived += (ri.receivedQty * unitPrice);

          const currentTotalValue = (item.current_stock || 0) * (item.avg_cost || item.cost_price);
          const newReceivedValue = ri.receivedQty * unitPrice;
          const newTotalQty = (item.current_stock || 0) + ri.receivedQty;
          const newWeightedAvg = (currentTotalValue + newReceivedValue) / newTotalQty;

          await db.from("inventory_items").update({
            current_stock: newTotalQty,
            last_restocked_at: new Date().toISOString(),
            last_purchase_cost: unitPrice,
            avg_cost: newWeightedAvg
          }).eq("id", ri.itemId);

          if (storeId) {
             await updateStoreStock(ri.itemId, storeId, ri.receivedQty, 'increment');
          }

          await db.from("stock_movements").insert({
            item_id: ri.itemId,
            movement_type: "in",
            quantity: ri.receivedQty,
            reference_type: "purchase_order",
            reference_id: poId,
            notes: `Received from PO (Batch: ${ri.batchNumber || 'N/A'})`,
          });
        }
      }

      const assetAcc = await getInventoryAccount('inventory_gl_account');
      const purchaseAcc = await getInventoryAccount('purchase_gl_account');
      await createFinanceEntry(`GRN for PO ID ${poId}`, [
         { account_id: assetAcc, debit: totalValueReceived, credit: 0 },
         { account_id: purchaseAcc, debit: 0, credit: totalValueReceived }
      ]);

      const { data: poItems } = await db.from("purchase_order_items").select("quantity, received_quantity").eq("purchase_order_id", poId);
      const allReceived = poItems?.every((pi) => (pi.received_quantity || 0) >= pi.quantity);
      const anyReceived = poItems?.some((pi) => (pi.received_quantity || 0) > 0);

      const newStatus = allReceived ? "received" : anyReceived ? "partially_received" : "sent";
      await db.from("purchase_orders").update({ status: newStatus, received_date: allReceived ? new Date().toISOString().split("T")[0] : null }).eq("id", poId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });

  return { ...query, createPurchaseOrder, receivePurchaseOrder, updatePurchaseOrderStatus };
}
