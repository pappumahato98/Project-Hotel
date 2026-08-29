import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

const db = supabase as any;

export interface FolioItem {
  id: string;
  folio_id: string;
  item_type: 'charge' | 'payment' | 'adjustment';
  source: string;
  description: string;
  amount: number;
  reference_id?: string;
  reason?: string;
  modified_by?: string;
  created_at: string;
}

export interface GuestFolio {
  id: string;
  reservation_id: string;
  room_id: string;
  guest_id: string;
  folio_number: string;
  status: 'open' | 'closed' | 'void';
  total_charges: number;
  total_payments: number;
  balance: number;
  created_at: string;
  updated_at: string;
  rooms?: { room_number: string; room_type: string };
  guests?: { first_name: string; last_name: string; email: string };
  reservations?: { reservation_code: string };
}

export interface RoutingRule {
  id: string;
  folio_id: string;
  category: 'room' | 'tax' | 'f&b' | 'incidentals' | 'all';
  target_folio_id: string;
  is_active: boolean;
}

export const useGuestFolios = () => {
  const queryClient = useQueryClient();

  const { data: folios, isLoading, error } = useQuery({
    queryKey: queryKeys.guests.folios,
    queryFn: async () => {
      const { data, error } = await db
        .from("guest_folios")
        .select(`*, rooms (room_number, room_type), guests (first_name, last_name, email), reservations (reservation_code)`)
        .not("status", "in", '("closed","void")')
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching folios:", error);
        return [] as GuestFolio[];
      }
      return data as GuestFolio[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Helper function to invalidate ALL folio-related queries
  const invalidateAllFolioQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.invoices.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    // Invalidate Night Audit query keys
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.pending() });
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.stayovers() });
    // Invalidate report stats
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.stats });
  }, [queryClient]);

  // Realtime subscription for guest folios
  useEffect(() => {
    const channel = supabase
      .channel("frontdesk-folios-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_folios" },
        () => {
          invalidateAllFolioQueries();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "folio_items" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.all });
          invalidateAllFolioQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, invalidateAllFolioQueries]);

  const useFolioItems = (folioId: string) => {
    return useQuery({
      queryKey: queryKeys.guests.folioItems.byFolio(folioId),
      queryFn: async () => {
        if (!folioId) return [];
        const { data, error } = await db
          .from("folio_items")
          .select("*")
          .eq("folio_id", folioId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching folio items:", error);
          return [] as FolioItem[];
        }
        return data as FolioItem[];
      },
      enabled: !!folioId,
    });
  };

  const addFolioItem = useMutation({
    mutationFn: async (item: Omit<FolioItem, "id" | "created_at">) => {
      const { data: rules } = await db
        .from("routing_rules")
        .select("*")
        .eq("folio_id", item.folio_id)
        .eq("is_active", true);

      let targetFolioId = item.folio_id;
      if (rules && rules.length > 0) {
        const rule = (rules as RoutingRule[]).find(r =>
          r.category === 'all' ||
          (r.category === 'room' && item.source === 'room_rate') ||
          (r.category === 'f&b' && (item.source === 'restaurant' || item.source === 'minibar'))
        );
        if (rule) targetFolioId = rule.target_folio_id;
      }

      const { data, error } = await db
        .from("folio_items")
        .insert([{ ...item, folio_id: targetFolioId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.folio_id) });
      if (data && data.folio_id !== variables.folio_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(data.folio_id) });
      }
      invalidateAllFolioQueries();
      toast.success("Folio item added successfully.");
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const closeFolio = useMutation({
    mutationFn: async (folioId: string) => {
      const { data, error } = await db
        .from("guest_folios")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", folioId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllFolioQueries();
      toast.success("Folio Closed", { description: "The folio has been finalized and closed." });
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const voidFolio = useMutation({
    mutationFn: async (folioId: string) => {
      const { data, error } = await db
        .from("guest_folios")
        .update({ status: "void", updated_at: new Date().toISOString() })
        .eq("id", folioId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllFolioQueries();
      toast.success("Folio Voided", { description: "The folio has been voided." });
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const updateFolioItem = useMutation({
    mutationFn: async (item: Partial<FolioItem> & { id: string; folio_id: string; reason?: string; modified_by?: string }) => {
      const { data, error } = await db
        .from("folio_items")
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.folio_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      toast.success("Folio item updated successfully.");
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const deleteFolioItem = useMutation({
    mutationFn: async ({ id, folio_id }: { id: string; folio_id: string }) => {
      const { error } = await db.from("folio_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.folio_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      toast.success("Folio item deleted successfully.");
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const transferFolioItem = useMutation({
    mutationFn: async ({ itemId, targetFolioId, sourceFolioId }: { itemId: string; targetFolioId: string; sourceFolioId: string }) => {
      const { data, error } = await db
        .from("folio_items")
        .update({ folio_id: targetFolioId })
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.sourceFolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.targetFolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      toast.success("Folio item transferred successfully.");
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const processRefund = useMutation({
    mutationFn: async ({ folio_id, amount, reason, method }: { folio_id: string; amount: number; reason: string; method: string }) => {
      const { data, error } = await db
        .from("folio_items")
        .insert([{
          folio_id,
          item_type: 'payment',
          source: 'refund',
          description: `Refund (${method.toUpperCase()}) - ${reason}`,
          amount: Math.abs(amount),
          reason
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.folio_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      toast.success("Refund Processed", { description: "The refund has been recorded successfully." });
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const useRoutingRules = (folioId: string) => {
    return useQuery({
      queryKey: queryKeys.guests.routingRules.byFolio(folioId),
      queryFn: async () => {
        if (!folioId) return [];
        const { data, error } = await db
          .from("routing_rules")
          .select("*")
          .eq("folio_id", folioId);
        if (error) {
          console.warn("Routing rules table might not exist, returning empty");
          return [];
        }
        return data as RoutingRule[];
      },
      enabled: !!folioId,
    });
  };

  const addRoutingRule = useMutation({
    mutationFn: async (rule: Omit<RoutingRule, "id">) => {
      const { data, error } = await db
        .from("routing_rules")
        .insert([rule])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.routingRules.byFolio(variables.folio_id) });
      toast.success("Routing rule added.");
    },
  });

  const deleteRoutingRule = useMutation({
    mutationFn: async ({ id, folioId }: { id: string; folioId: string }) => {
      const { error } = await db.from("routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.routingRules.byFolio(variables.folioId) });
      toast.success("Routing rule removed.");
    },
  });

  const bulkPostCharges = useMutation({
    mutationFn: async ({ folioIds, description, amount, source }: { folioIds: string[], description: string, amount: number, source: string }) => {
      const chargeItems = folioIds.map(folio_id => ({
        folio_id,
        item_type: 'charge',
        source,
        description,
        amount: Math.abs(amount)
      }));

      const { error } = await db.from("folio_items").insert(chargeItems);
      if (error) throw error;
      return { count: folioIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.all });
      toast.success("Bulk Post Success", { description: "Charges posted to all selected folios." });
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    }
  });

  const createFolio = useMutation({
    mutationFn: async (folio: Partial<GuestFolio>) => {
      const { data, error } = await db
        .from("guest_folios")
        .insert([folio])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllFolioQueries();
      toast.success("New folio created successfully.");
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    },
  });

  const settleToCityLedger = useMutation({
    mutationFn: async ({ folio_id, company_id, amount, notes }: { folio_id: string, company_id: string, amount: number, notes?: string }) => {
      // 1. Record the settlement as a payment in folio_items
      const { error: itemError } = await db
        .from("folio_items")
        .insert([{
          folio_id,
          item_type: 'payment',
          source: 'city_ledger',
          description: `Settlement to City Ledger - Company ID: ${company_id}`,
          amount: -Math.abs(amount),
          reference_id: company_id,
          reason: notes
        }]);

      if (itemError) throw itemError;

      // 2. Optionally close the folio if balance is zero (handled by logic later or here)
      // For now we just record the settlement.
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.byFolio(variables.folio_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      toast.success("Folio settled to City Ledger.");
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    }
  });

  const postRoomCharges = useMutation({
    mutationFn: async ({ businessDate }: { businessDate: string }) => {
      // 1. Get all in-house reservations
      const { data: inHouse, error: resError } = await db
        .from("reservations")
        .select("id, room_id, rooms(price_per_night, room_number)")
        .eq("status", "checked-in");

      if (resError) throw resError;
      if (!inHouse || inHouse.length === 0) return { count: 0 };

      // 2. Get active folios for these reservations
      const { data: folios, error: folioError } = await db
        .from("guest_folios")
        .select("id, reservation_id")
        .in("reservation_id", inHouse.map(r => r.id))
        .eq("status", "open");

      if (folioError) throw folioError;

      const chargeItems = [];
      let totalRevenue = 0;
      for (const res of inHouse) {
        const folio = folios?.find(f => f.reservation_id === res.id);
        const roomPrice = res.rooms?.price_per_night;
        if (folio && roomPrice) {
          // Check if already posted for this date to prevent duplicates
          const { data: existing } = await db
            .from("folio_items")
            .select("id")
            .eq("folio_id", folio.id)
            .eq("source", "room_rate")
            .eq("description", `Room Charge - ${businessDate}`)
            .maybeSingle();

          if (!existing) {
            chargeItems.push({
              folio_id: folio.id,
              item_type: 'charge',
              source: 'room_rate',
              description: `Room Charge - ${businessDate}`,
              amount: roomPrice
            });
            totalRevenue += roomPrice;
          }
        }
      }

      if (chargeItems.length > 0) {
        const { error: insertError } = await db.from("folio_items").insert(chargeItems);
        if (insertError) throw insertError;
      }

      return { count: chargeItems.length, totalRevenue };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.folioItems.all });
      toast.success("Night Audit Posting", { description: `Successfully posted room charges for ${data.count} rooms.` });
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message });
    }
  });

  return {
    folios, isLoading, error,
    useFolioItems, addFolioItem, closeFolio, voidFolio,
    updateFolioItem, deleteFolioItem, transferFolioItem,
    createFolio, processRefund, settleToCityLedger, postRoomCharges, bulkPostCharges,
    useRoutingRules, addRoutingRule, deleteRoutingRule,
  };
};
