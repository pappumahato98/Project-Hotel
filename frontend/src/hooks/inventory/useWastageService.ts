import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db, updateStoreStock, getInventoryAccount, createFinanceEntry } from "./utils";
import { InventorySupplierReturn, InventorySupplierReturnItem } from "@/types/inventory";

export function useInventoryReturns() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-supplier-returns"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_supplier_returns")
        .select(`*, supplier:suppliers(*), items:inventory_supplier_return_items(*, item:inventory_items(*))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InventorySupplierReturn[];
    },
  });

  const createReturn = useMutation({
    mutationFn: async ({ items, ...ret }: { items: Partial<InventorySupplierReturnItem>[], supplier_id?: string, purchase_order_id?: string, reason?: string, total_amount: number, resolution?: string }) => {
      const returnNumber = `RTN-${Date.now().toString(36).toUpperCase()}`;
      const { data: sRet, error: retErr } = await db.from("inventory_supplier_returns").insert({
        ...ret,
        return_number: returnNumber,
        status: 'completed'
      } as any).select().single();
      if (retErr) throw retErr;

      let totalReturnValue = 0;
      for (const item of items) {
        const { data: invItem } = await db.from("inventory_items").select("current_stock").eq("id", item.item_id as string).single();

        await db.from("inventory_supplier_return_items").insert({
          supplier_return_id: sRet.id,
          item_id: item.item_id as string,
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total_price: (item.quantity || 0) * (item.unit_price || 0)
        });

        totalReturnValue += ((item.quantity || 0) * (item.unit_price || 0));

        await db.from("inventory_items").update({
          current_stock: Math.max(0, (invItem?.current_stock || 0) - (item.quantity || 0))
        }).eq("id", item.item_id as string);

        await db.from("stock_movements").insert({
          item_id: item.item_id as string,
          movement_type: "out",
          quantity: item.quantity || 0,
          reference_type: "supplier_return",
          reference_id: sRet.id,
          notes: `Return to supplier: ${ret.reason || 'Damaged/Expired'}`,
        });
      }

      const assetAcc = await getInventoryAccount('inventory_gl_account');
      const purchaseAcc = await getInventoryAccount('purchase_gl_account');

      if (ret.reason?.toUpperCase().includes('(REFUND)')) {
         await createFinanceEntry(`Supplier Return (Debit Note): ${returnNumber}`, [
            { account_id: purchaseAcc, debit: totalReturnValue, credit: 0 },
            { account_id: assetAcc, debit: 0, credit: totalReturnValue }
         ]);
      }

      return sRet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-supplier-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });

  return { ...query, createReturn };
}
