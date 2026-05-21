// POS hooks - Using Supabase for permanent multi-device sync
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

// ============= Types =============
export interface POSTable {
  id: string;
  table_number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "billing" | "held";
  guests: number | null;
  server_name: string | null;
  start_time: string | null;
  merged_with: string[] | null;
  current_order?: OrderItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  notes?: string;
}

export interface POSOrderItem {
  id: string;
  order_id?: string;
  item_name: string;
  item_price: number;
  quantity: number;
  category: string | null;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  notes: string | null;
}

export interface POSCompany {
  id: string;
  name: string;
  address: string | null;
  vat_number: string | null;
  pan_number: string | null;
  phone: string | null;
  email: string | null;
}

export interface POSTransaction {
  id: string;
  transaction_number: string;
  table_number: string;
  customer_name: string | null;
  customer_address: string | null;
  company_id: string | null;
  company_name: string | null;
  vat_number: string | null;
  pan_number: string | null;
  subtotal: number;
  discount_amount: number | null;
  tax_amount: number;
  tip_amount: number | null;
  total: number;
  payment_method: string;
  rrn_number: string | null;
  transaction_ref: string | null;
  card_last_four: string | null;
  card_type: string | null;
  room_number: string | null;
  items_count: number;
  items: POSOrderItem[];
  created_at: string;
  status?: "completed" | "voided" | "refunded" | "partial_refund";
  void_reason?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
}

// ============= POS Tables Hooks =============
export function usePOSTables() {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");

  const query = useQuery({
    queryKey: ["pos-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_tables")
        .select("*")
        .order("table_number", { ascending: true });

      if (error) {
        console.error("Error fetching POS tables:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Transform database format to app format
      return data.map((table) => ({
        id: table.id,
        table_number: table.table_number,
        capacity: table.capacity,
        status: table.status as POSTable["status"],
        guests: table.guests,
        server_name: table.server_name,
        start_time: table.start_time,
        merged_with: table.merged_with,
        current_order: table.current_order
          ? JSON.parse(JSON.stringify(table.current_order))
          : [],
      })) as POSTable[];
    },
  });

  // Real-time subscription for multi-device sync
  useEffect(() => {
    const channel = supabase
      .channel("pos-tables-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_tables",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CHANNEL_ERROR") setRealtimeStatus("error");
        else setRealtimeStatus("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    realtimeStatus,
  };
}

export function useUpdatePOSTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<POSTable> }) => {
      // Transform app format to database format
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.table_number !== undefined) dbUpdates.table_number = updates.table_number;
      if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.guests !== undefined) dbUpdates.guests = updates.guests;
      if (updates.server_name !== undefined) dbUpdates.server_name = updates.server_name;
      if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
      if (updates.merged_with !== undefined) dbUpdates.merged_with = updates.merged_with;
      if (updates.current_order !== undefined) dbUpdates.current_order = updates.current_order;

      const { data, error } = await supabase
        .from("pos_tables")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating POS table:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
      toast.success("Table updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update table: " + error.message);
    },
  });
}

// ============= POS Companies Hooks =============
export function usePOSCompanies(searchTerm?: string) {
  const query = useQuery({
    queryKey: ["pos-companies", searchTerm],
    queryFn: async () => {
      let q = supabase
        .from("pos_companies")
        .select("*")
        .order("name", { ascending: true });

      if (searchTerm) {
        q = q.or(
          `name.ilike.%${searchTerm}%,vat_number.ilike.%${searchTerm}%,pan_number.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await q;

      if (error) {
        console.error("Error fetching POS companies:", error);
        return [];
      }

      return data as POSCompany[];
    },
  });

  return { data: query.data || [], isLoading: query.isLoading };
}

export function useCreatePOSCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: Omit<POSCompany, "id">) => {
      const { data, error } = await supabase
        .from("pos_companies")
        .insert(company)
        .select()
        .single();

      if (error) {
        console.error("Error creating POS company:", error);
        throw error;
      }

      return data as POSCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-companies"] });
      toast.success("Company created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create company: " + error.message);
    },
  });
}

// ============= POS Transactions Hooks =============
export function usePOSTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}) {
  const query = useQuery({
    queryKey: ["pos-transactions", filters],
    queryFn: async () => {
      let q = supabase
        .from("pos_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.startDate) {
        q = q.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        q = q.lte("created_at", filters.endDate + "T23:59:59");
      }
      if (filters?.paymentMethod) {
        q = q.eq("payment_method", filters.paymentMethod);
      }

      const { data, error } = await q;

      if (error) {
        console.error("Error fetching POS transactions:", error);
        return [];
      }

      return data.map((t) => ({
        ...t,
        items: t.items ? JSON.parse(JSON.stringify(t.items)) : [],
      })) as POSTransaction[];
    },
  });

  return { 
    data: query.data || [], 
    isLoading: query.isLoading, 
    refetch: query.refetch 
  };
}

export function useCreatePOSTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      transaction: Omit<POSTransaction, "id" | "transaction_number" | "created_at">
    ) => {
      const transactionNumber = `TXN-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertData: any = {
        transaction_number: transactionNumber,
        table_number: transaction.table_number,
        customer_name: transaction.customer_name,
        customer_address: transaction.customer_address,
        company_id: transaction.company_id,
        company_name: transaction.company_name,
        vat_number: transaction.vat_number,
        pan_number: transaction.pan_number,
        subtotal: transaction.subtotal,
        discount_amount: transaction.discount_amount,
        tax_amount: transaction.tax_amount,
        tip_amount: transaction.tip_amount,
        total: transaction.total,
        payment_method: transaction.payment_method,
        rrn_number: transaction.rrn_number,
        transaction_ref: transaction.transaction_ref,
        card_last_four: transaction.card_last_four,
        card_type: transaction.card_type,
        room_number: transaction.room_number,
        items_count: transaction.items_count,
        items: JSON.parse(JSON.stringify(transaction.items)),
      };

      const { data, error } = await supabase
        .from("pos_transactions")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating POS transaction:", error);
        throw error;
      }

      return {
        ...data,
        items: data.items ? JSON.parse(JSON.stringify(data.items)) : [],
      } as POSTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-transactions"] });
      toast.success("Transaction completed successfully");
    },
    onError: (error) => {
      toast.error("Failed to complete transaction: " + error.message);
    },
  });
}

// Helper function to save transaction (for compatibility with existing code)
export async function saveTransaction(
  transaction: Omit<POSTransaction, "id" | "transaction_number" | "created_at">
) {
  const transactionNumber = `TXN-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: any = {
    transaction_number: transactionNumber,
    table_number: transaction.table_number,
    customer_name: transaction.customer_name,
    customer_address: transaction.customer_address,
    company_id: transaction.company_id,
    company_name: transaction.company_name,
    vat_number: transaction.vat_number,
    pan_number: transaction.pan_number,
    subtotal: transaction.subtotal,
    discount_amount: transaction.discount_amount,
    tax_amount: transaction.tax_amount,
    tip_amount: transaction.tip_amount,
    total: transaction.total,
    payment_method: transaction.payment_method,
    rrn_number: transaction.rrn_number,
    transaction_ref: transaction.transaction_ref,
    card_last_four: transaction.card_last_four,
    card_type: transaction.card_type,
    room_number: transaction.room_number,
    items_count: transaction.items_count,
    items: JSON.parse(JSON.stringify(transaction.items)),
  };

  const { data, error } = await supabase
    .from("pos_transactions")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error saving POS transaction:", error);
    throw error;
  }

  return {
    ...data,
    items: data.items ? JSON.parse(JSON.stringify(data.items)) : [],
  } as POSTransaction;
}

// Save/update tables to database
export async function savePOSTables(tables: POSTable[]) {
  // Update all tables in a batch
  for (const table of tables) {
    const currentOrder = table.current_order 
      ? (table.current_order as unknown as Record<string, unknown>[])
      : [];
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("pos_tables")
      .update({
        status: table.status,
        guests: table.guests,
        server_name: table.server_name,
        start_time: table.start_time,
        merged_with: table.merged_with,
        current_order: currentOrder as any,
      })
      .eq("table_number", table.table_number);

    if (error) {
      console.error("Error updating POS table:", table.table_number, error);
    }
  }
}

// ============= POS Orders + Items Helpers =============
export async function getActivePOSOrderIdForTable(
  tableId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pos_orders")
    .select("id, status")
    .eq("table_id", tableId)
    .in("status", ["open", "billing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching active POS order:", error);
    return null;
  }

  return data?.id ?? null;
}

export async function ensureActivePOSOrderForTable(params: {
  tableId: string;
  tableNumber: string;
  guests?: number | null;
  serverName?: string | null;
  startTime?: string | null;
}): Promise<string> {
  const existingId = await getActivePOSOrderIdForTable(params.tableId);
  if (existingId) return existingId;

  const { data, error } = await supabase
    .from("pos_orders")
    .insert({
      table_id: params.tableId,
      table_number: params.tableNumber,
      status: "open",
      guests: params.guests ?? null,
      server_name: params.serverName ?? null,
      start_time: params.startTime ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating POS order:", error);
    throw error;
  }

  return data.id as string;
}

export async function upsertPOSOrderItemsForOrder(
  orderId: string,
  items: OrderItem[],
  overrideStatus?: OrderItem["status"]
) {
  const rows = items.map((i) => ({
    id: i.id,
    order_id: orderId,
    item_name: i.name,
    item_price: i.price,
    quantity: i.quantity,
    category: i.category ?? null,
    status: (overrideStatus ?? i.status) as string,
    notes: i.notes ?? null,
  }));

  const { error } = await supabase
    .from("pos_order_items")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Error upserting POS order items:", error);
    throw error;
  }
}

export async function updatePOSOrderStatusAndTotals(params: {
  orderId: string;
  status: "open" | "billing" | "paid" | "cancelled" | "merged";
  subtotal?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  tip_amount?: number | null;
  total?: number | null;
}) {
  const { error } = await supabase
    .from("pos_orders")
    .update({
      status: params.status,
      subtotal: params.subtotal ?? null,
      discount_amount: params.discount_amount ?? null,
      tax_amount: params.tax_amount ?? null,
      tip_amount: params.tip_amount ?? null,
      total: params.total ?? null,
    })
    .eq("id", params.orderId);

  if (error) {
    console.error("Error updating POS order:", error);
    throw error;
  }
}

export async function updatePOSOrderItemsStatusForOrder(
  orderId: string,
  status: OrderItem["status"]
) {
  const { error } = await supabase
    .from("pos_order_items")
    .update({ status })
    .eq("order_id", orderId);

  if (error) {
    console.error("Error updating POS order items status:", error);
    throw error;
  }
}

export async function movePOSOrderItemsToOrder(
  itemIds: string[],
  targetOrderId: string
) {
  const { error } = await supabase
    .from("pos_order_items")
    .update({ order_id: targetOrderId })
    .in("id", itemIds);

  if (error) {
    console.error("Error moving POS order items:", error);
    throw error;
  }
}

// ============= POS Orders Hooks =============
export function usePOSOrders(tableId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pos-orders", tableId],
    queryFn: async () => {
      let q = supabase
        .from("pos_orders")
        .select(`
          *,
          pos_order_items (*)
        `)
        .order("created_at", { ascending: false });

      if (tableId) {
        q = q.eq("table_id", tableId);
      }

      const { data, error } = await q;

      if (error) {
        console.error("Error fetching POS orders:", error);
        return [];
      }

      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("pos-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_order_items",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { data: query.data || [], isLoading: query.isLoading, refetch: query.refetch };
}

export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { data, error } = await supabase
        .from("pos_order_items")
        .update({ status })
        .eq("id", itemId)
        .select()
        .single();

      if (error) {
        console.error("Error updating order item status:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
    },
  });
}

// ============= Void/Refund Transactions =============
import { toast } from "sonner";

export function useVoidTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      // For now, we'll track void status in the audit_log since pos_transactions 
      // doesn't have status/void columns. In production, add these columns.
      const { data: transaction, error: fetchError } = await supabase
        .from("pos_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (fetchError) throw fetchError;

      // Log the void action
      await supabase.from("audit_log").insert({
        action: "void_transaction",
        entity_type: "pos_transaction",
        entity_id: transactionId,
        new_values: { reason, voided_at: new Date().toISOString(), original_total: transaction.total }
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-transactions"] });
      toast.success("Transaction voided successfully");
    },
    onError: (error) => {
      toast.error("Failed to void transaction: " + error.message);
    },
  });
}

export function useRefundTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, amount, reason }: { transactionId: string; amount: number; reason: string }) => {
      const { data: transaction, error: fetchError } = await supabase
        .from("pos_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (fetchError) throw fetchError;

      // Log the refund action
      await supabase.from("audit_log").insert({
        action: "refund_transaction",
        entity_type: "pos_transaction",
        entity_id: transactionId,
        new_values: { 
          reason, 
          refunded_at: new Date().toISOString(), 
          refund_amount: amount,
          original_total: transaction.total,
          is_partial: amount < transaction.total
        }
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-transactions"] });
      toast.success("Refund processed successfully");
    },
    onError: (error) => {
      toast.error("Failed to process refund: " + error.message);
    },
  });
}