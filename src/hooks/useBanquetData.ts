 // Hooks for banquet catering and venue setup data
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const db = supabase as any;
 
 // Types
 export interface CateringOrder {
   id: string;
   event_id: string;
   menu_package: string;
   serving_style: string;
   dietary_requirements: string[];
   beverage_selections: string[];
   special_instructions: string | null;
   total_cost: number;
   status: "pending" | "confirmed" | "preparing" | "ready" | "served";
   created_at: string;
   updated_at: string;
 }
 
 export interface VenueSetup {
   id: string;
   event_id: string;
   layout_type: string;
   capacity: number | null;
   equipment_needed: string[];
   decoration_checklist: string[];
   status: "not_started" | "in_progress" | "completed";
   notes: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export interface EventStaffAssignment {
   id: string;
   event_id: string;
   staff_id: string;
   role: string;
   start_time: string;
   end_time: string;
   notes: string | null;
   created_at: string;
 }
 
 // ============= Catering Orders =============
 export function useCateringOrders(eventId?: string) {
   return useQuery({
     queryKey: ["event-catering", eventId],
     queryFn: async () => {
       let query = db
         .from("event_catering")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (eventId) {
         query = query.eq("event_id", eventId);
       }
 
       const { data, error } = await query;
       if (error) throw error;
       return (data || []) as CateringOrder[];
     },
     enabled: true,
   });
 }
 
 export function useCreateCateringOrder() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (order: Omit<CateringOrder, "id" | "created_at" | "updated_at">) => {
       const { data, error } = await db
         .from("event_catering")
         .insert(order)
         .select()
         .single();
 
       if (error) throw error;
       return data as CateringOrder;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["event-catering"] });
       toast.success("Catering order created");
     },
     onError: (error) => {
       toast.error("Failed to create catering order: " + error.message);
     },
   });
 }
 
 // ============= Cross-Module Billing =============
 export function usePostBanquetToFolio() {
   const queryClient = useQueryClient();

   return useMutation({
     mutationFn: async ({ eventId, folioId, amount, description }: { eventId: string, folioId: string, amount: number, description: string }) => {
       const { data, error } = await db
         .from("folio_items")
         .insert([{
           folio_id: folioId,
           item_type: 'charge',
           source: 'banquet',
           description: description,
           amount: Math.abs(amount),
           reference_id: eventId
         }])
         .select()
         .single();

       if (error) throw error;

       // Also update event status to 'completed' or similar if needed
       await db.from("banquet_events").update({ notes: `Billed to Folio ID: ${folioId}` }).eq("id", eventId);

       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
       queryClient.invalidateQueries({ queryKey: ["folio_items"] });
       queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
       toast.success("Banquet charges posted to guest folio");
     },
     onError: (error: any) => {
       toast.error("Failed to post banquet charges: " + error.message);
     },
   });
 }

 export function useUpdateCateringOrder() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, updates }: { id: string; updates: Partial<CateringOrder> }) => {
       const { data, error } = await db
         .from("event_catering")
         .update(updates)
         .eq("id", id)
         .select()
         .single();
 
       if (error) throw error;
       return data as CateringOrder;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["event-catering"] });
       toast.success("Catering order updated");
     },
     onError: (error) => {
       toast.error("Failed to update catering order: " + error.message);
     },
   });
 }
 
 // ============= Venue Setups =============
 export function useVenueSetups(eventId?: string) {
   return useQuery({
     queryKey: ["event-venue-setups", eventId],
     queryFn: async () => {
       let query = db
         .from("event_venue_setups")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (eventId) {
         query = query.eq("event_id", eventId);
       }
 
       const { data, error } = await query;
       if (error) throw error;
       return (data || []) as VenueSetup[];
     },
     enabled: true,
   });
 }
 
 export function useCreateVenueSetup() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (setup: Omit<VenueSetup, "id" | "created_at" | "updated_at">) => {
       const { data, error } = await db
         .from("event_venue_setups")
         .insert(setup)
         .select()
         .single();
 
       if (error) throw error;
       return data as VenueSetup;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["event-venue-setups"] });
       toast.success("Venue setup created");
     },
     onError: (error) => {
       toast.error("Failed to create venue setup: " + error.message);
     },
   });
 }
 
 export function useUpdateVenueSetup() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, updates }: { id: string; updates: Partial<VenueSetup> }) => {
       const { data, error } = await db
         .from("event_venue_setups")
         .update(updates)
         .eq("id", id)
         .select()
         .single();
 
       if (error) throw error;
       return data as VenueSetup;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["event-venue-setups"] });
       toast.success("Venue setup updated");
     },
     onError: (error) => {
       toast.error("Failed to update venue setup: " + error.message);
     },
   });
 }
 
 // ============= Staff Assignments =============
 export function useEventStaffAssignments(eventId?: string) {
   return useQuery({
     queryKey: ["event-staff-assignments", eventId],
     queryFn: async () => {
       let query = db
         .from("event_staff_assignments")
         .select(`
           *,
           staff_member:staff_members(id, first_name, last_name, position, department)
         `)
         .order("start_time", { ascending: true });
 
       if (eventId) {
         query = query.eq("event_id", eventId);
       }
 
       const { data, error } = await query;
       if (error) throw error;
       return data || [];
     },
     enabled: true,
   });
 }
 
 export function useCreateStaffAssignment() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (assignment: Omit<EventStaffAssignment, "id" | "created_at">) => {
       const { data, error } = await db
         .from("event_staff_assignments")
         .insert(assignment)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["event-staff-assignments"] });
       toast.success("Staff assigned to event");
     },
     onError: (error) => {
       toast.error("Failed to assign staff: " + error.message);
     },
   });
 }
 
 export function useDeleteStaffAssignment() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (id: string) => {
       const { error } = await db
         .from("event_staff_assignments")
         .delete()
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["event-staff-assignments"] });
       toast.success("Staff unassigned from event");
     },
     onError: (error) => {
       toast.error("Failed to remove staff assignment: " + error.message);
     },
   });
 }