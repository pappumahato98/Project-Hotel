import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useInventoryItems } from "./useItemService";
import { usePurchaseOrders } from "./useProcurementService";

export function useInventoryAutomation() {
  const queryClient = useQueryClient();
  const { data: items = [] } = useInventoryItems();
  const { createPurchaseOrder } = usePurchaseOrders();

  const generateLowStockPOs = useMutation({
    mutationFn: async () => {
      const lowStock = items.filter(i => i.current_stock <= i.reorder_point);
      if (lowStock.length === 0) return null;

      const bySupplier: Record<string, any[]> = {};
      lowStock.forEach(i => {
        const sid = i.supplier_id || "unknown";
        if (!bySupplier[sid]) bySupplier[sid] = [];
        bySupplier[sid].push(i);
      });

      for (const [sid, sItems] of Object.entries(bySupplier)) {
        const poItems = sItems.map(i => ({
          item_id: i.id,
          quantity: Math.max(10, (i.reorder_point * 2) - i.current_stock),
          unit_price: i.cost_price
        }));

        await createPurchaseOrder.mutateAsync({
          supplier_id: sid === "unknown" ? null : sid,
          status: "draft",
          order_date: new Date().toISOString().split('T')[0],
          subtotal: poItems.reduce((s, pi) => s + (pi.quantity * pi.unit_price), 0),
          tax_amount: 0,
          total: poItems.reduce((s, pi) => s + (pi.quantity * pi.unit_price), 0),
          notes: "Automated low-stock replenishment PO",
          items: poItems
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Draft POs generated for all low-stock items");
    }
  });

  return { generateLowStockPOs };
}
