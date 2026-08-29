import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { db } from "./utils";
import { InventoryRequisition, InventoryRequisitionItem, InventoryStockIssue, InventoryStockIssueItem } from "@/types/inventory";
import { convertUoM, updateStoreStock, getInventoryAccount, createFinanceEntry } from "./utils";

export function useInventoryRequisitions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-requisitions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_requisitions")
        .select(`*, items:inventory_requisition_items(*, item:inventory_items(*))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InventoryRequisition[];
    },
  });

  const createRequisition = useMutation({
    mutationFn: async ({ items, ...req }: { items: Partial<InventoryRequisitionItem>[], department: string, priority: string, notes?: string, requested_by?: string }) => {
      const reqNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;
      const { data: requisition, error: reqError } = await db.from("inventory_requisitions").insert({ ...req, requisition_number: reqNumber } as any).select().single();
      if (reqError) throw reqError;

      const reqItems = items.map((i) => ({ ...i, requisition_id: requisition.id }));
      const { error: itemsError } = await db.from("inventory_requisition_items").insert(reqItems as any);
      if (itemsError) throw itemsError;
      return requisition;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] }),
  });

  const updateRequisitionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await db.from("inventory_requisitions").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] }),
  });

  return { ...query, createRequisition, updateRequisitionStatus };
}

export function useInventoryIssues() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inventory-issues"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_stock_issues")
        .select(`*, items:inventory_stock_issue_items(*, item:inventory_items(*))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InventoryStockIssue[];
    },
  });

  const createIssue = useMutation({
    mutationFn: async ({ items, requisition_id, storeId, ...issue }: { items: Partial<InventoryStockIssueItem>[], requisition_id?: string, storeId?: string, department: string, issued_to?: string, issued_by?: string, notes?: string }) => {
      const issueNumber = `SIV-${Date.now().toString(36).toUpperCase()}`;
      let totalIssueValue = 0;

      const { data: sIssue, error: issueErr } = await db.from("inventory_stock_issues").insert({
        ...issue,
        requisition_id,
        issue_number: issueNumber
      } as any).select().single();
      if (issueErr) throw issueErr;

      for (const item of items) {
        const { data: invItem } = await db.from("inventory_items").select("name, current_stock, uom_id, cost_price, avg_cost, reorder_point").eq("id", item.item_id as string).single();

        let finalDeduction = item.quantity || 0;
        if ((item as any).uom_id && invItem?.uom_id && (item as any).uom_id !== invItem.uom_id) {
           finalDeduction = await convertUoM((item as any).uom_id as string, invItem.uom_id, item.quantity || 0);
        }

        totalIssueValue += (finalDeduction * (invItem?.avg_cost || invItem?.cost_price || 0));

        await db.from("inventory_stock_issue_items").insert({
          stock_issue_id: sIssue.id,
          item_id: item.item_id as string,
          quantity: item.quantity || 0,
          batch_number: item.batch_number
        } as any);

        await db.from("inventory_items").update({
          current_stock: Math.max(0, (invItem?.current_stock || 0) - finalDeduction)
        }).eq("id", item.item_id as string);

        if (storeId) {
           await updateStoreStock(item.item_id as string, storeId, finalDeduction, 'decrement');
        }

        await db.from("stock_movements").insert({
          item_id: item.item_id as string,
          movement_type: "out",
          quantity: finalDeduction,
          reference_type: "stock_issue",
          reference_id: sIssue.id,
          notes: `Stock issue to ${issue.department}`,
        });
      }

      const assetAcc = await getInventoryAccount('inventory_gl_account');
      const consumeAcc = await getInventoryAccount('consumption_gl_account');
      await createFinanceEntry(`Stock Issue to ${issue.department}`, [
         { account_id: consumeAcc, debit: totalIssueValue, credit: 0 },
         { account_id: assetAcc, debit: 0, credit: totalIssueValue }
      ]);

      if (requisition_id) {
        await db.from("inventory_requisitions").update({ status: "fully_ordered" }).eq("id", requisition_id);
      }

      return sIssue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-issues"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });

  return { ...query, createIssue };
}
