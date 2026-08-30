import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { useEffect } from "react";

// ============= Types =============
export interface HousekeepingTask {
  id: string;
  room_id: string | null;
  task_type: string;
  assigned_to: string | null;
  priority: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  inspection_notes: string | null;
  inspection_score: number | null;
  created_at: string;
  room?: { room_number: string; room_type: string; floor: number };
}

export interface LostAndFound {
  id: string;
  item_description: string;
  found_location: string;
  found_date: string;
  found_by: string | null;
  category: string | null;
  status: string;
  storage_location: string | null;
  guest_id: string | null;
  claimed_date: string | null;
  claimed_by: string | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export interface HousekeepingInspection {
  id: string;
  room_id: string;
  inspector_id: string | null;
  inspection_date: string;
  overall_score: number | null;
  cleanliness_score: number | null;
  amenities_score: number | null;
  maintenance_score: number | null;
  status: string;
  notes: string | null;
  issues: unknown[];
  created_at: string;
  room?: { room_number: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= Housekeeping Tasks =============
export function useHousekeepingTasks(filters?: { date?: string; status?: string; priority?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.housekeeping.tasks.filtered(filters),
    queryFn: async () => {
      let q = db
        .from("housekeeping_tasks")
        .select(`*, room:rooms(room_number, room_type, floor)`)
        .order("scheduled_date", { ascending: true })
        .order("priority", { ascending: false });

      if (filters?.date) q = q.eq("scheduled_date", filters.date);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.priority) q = q.eq("priority", filters.priority);

      const { data, error } = await q;
      if (error) throw error;
      return data as HousekeepingTask[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("housekeeping-tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "housekeeping_tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.guests.folios });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createTask = useMutation({
    mutationFn: async (task: Omit<HousekeepingTask, "id" | "created_at" | "room">) => {
      const { data, error } = await db.from("housekeeping_tasks").insert(task).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HousekeepingTask> & { id: string }) => {
      const { data, error } = await db.from("housekeeping_tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.tasks.all }),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "in_progress") updates.started_at = new Date().toISOString();
      if (status === "completed") updates.completed_at = new Date().toISOString();

      const { data, error } = await db.from("housekeeping_tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;

      // Sync with rooms table if completed or in progress
      if (data.room_id) {
        if (status === "completed") {
          await db.from("rooms").update({ status: "available" }).eq("id", data.room_id);
        } else if (status === "in_progress") {
          await db.from("rooms").update({ status: "cleaning" }).eq("id", data.room_id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.roomsStatus });
    },
  });

  return { ...query, createTask, updateTask, updateTaskStatus };
}

// ============= Lost and Found =============
export function useLostAndFound(status?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.housekeeping.lostAndFound.byStatus(status),
    queryFn: async () => {
      let q = db
        .from("lost_and_found")
        .select("*")
        .order("found_date", { ascending: false });

      if (status) q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw error;
      return data as LostAndFound[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (item: Omit<LostAndFound, "id" | "created_at">) => {
      const { data, error } = await db.from("lost_and_found").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.lostAndFound.all }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LostAndFound> & { id: string }) => {
      const { data, error } = await db.from("lost_and_found").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.lostAndFound.all }),
  });

  const claimItem = useMutation({
    mutationFn: async ({ id, claimedBy, guestId }: { id: string; claimedBy: string; guestId?: string }) => {
      const { data, error } = await db.from("lost_and_found").update({
        status: "claimed",
        claimed_date: new Date().toISOString().split("T")[0],
        claimed_by: claimedBy,
        guest_id: guestId,
      }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.lostAndFound.all }),
  });

  return { ...query, createItem, updateItem, claimItem };
}

// ============= Inspections =============
export function useHousekeepingInspections(roomId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.housekeeping.inspections.byRoom(roomId),
    queryFn: async () => {
      let q = db
        .from("housekeeping_inspections")
        .select(`*, room:rooms(room_number)`)
        .order("inspection_date", { ascending: false });

      if (roomId) q = q.eq("room_id", roomId);

      const { data, error } = await q;
      if (error) throw error;
      return data as HousekeepingInspection[];
    },
  });

  const createInspection = useMutation({
    mutationFn: async (inspection: Omit<HousekeepingInspection, "id" | "created_at" | "room">) => {
      const { data, error } = await db.from("housekeeping_inspections").insert(inspection).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.housekeeping.inspections.all }),
  });

  return { ...query, createInspection };
}

// ============= Stats =============
export function useHousekeepingStats(date?: string) {
  const { data: tasks } = useHousekeepingTasks({ date: date || new Date().toISOString().split("T")[0] });

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter((t) => t.status === "pending").length || 0,
    inProgress: tasks?.filter((t) => t.status === "in_progress").length || 0,
    completed: tasks?.filter((t) => t.status === "completed").length || 0,
    highPriority: tasks?.filter((t) => t.priority === "high" || t.priority === "urgent").length || 0,
  };

  return stats;
}
