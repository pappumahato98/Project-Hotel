import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// ============= Types =============
export interface StaffSchedule {
  id: string;
  staff_id: string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  department: string | null;
  position: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  staff?: { first_name: string; last_name: string; employee_id: string };
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  staff?: { first_name: string; last_name: string; employee_id: string };
}

export interface LeaveBalance {
  id: string;
  staff_id: string;
  leave_type: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
}

export interface PayrollRecord {
  id: string;
  staff_id: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  overtime_hours: number;
  overtime_pay: number;
  allowances: number;
  deductions: number;
  tax_amount: number;
  net_pay: number;
  status: string;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  staff?: { first_name: string; last_name: string; employee_id: string };
}

export interface TimeClockEntry {
  id: string;
  staff_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
  created_at: string;
  staff?: { first_name: string; last_name: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= Staff Schedules =============
export function useStaffSchedules(filters?: { date?: string; staffId?: string; department?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["staff-schedules", filters],
    queryFn: async () => {
      let q = db
        .from("staff_schedules")
        .select(`*, staff:staff_members(first_name, last_name, employee_id)`)
        .order("shift_date")
        .order("shift_start");

      if (filters?.date) q = q.eq("shift_date", filters.date);
      if (filters?.staffId) q = q.eq("staff_id", filters.staffId);
      if (filters?.department) q = q.eq("department", filters.department);

      const { data, error } = await q;
      if (error) throw error;
      return data as StaffSchedule[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("staff-schedules-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_schedules" }, () => {
        queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<StaffSchedule, "id" | "created_at" | "staff">) => {
      const { data, error } = await db.from("staff_schedules").insert(schedule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-schedules"] }),
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffSchedule> & { id: string }) => {
      const { data, error } = await db.from("staff_schedules").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-schedules"] }),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("staff_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-schedules"] }),
  });

  return { ...query, createSchedule, updateSchedule, deleteSchedule };
}

// ============= Leave Requests =============
export function useLeaveRequests(filters?: { status?: string; staffId?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leave-requests", filters],
    queryFn: async () => {
      let q = db
        .from("leave_requests")
        .select(`*, staff:staff_members(first_name, last_name, employee_id)`)
        .order("created_at", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.staffId) q = q.eq("staff_id", filters.staffId);

      const { data, error } = await q;
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("leave-requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createLeaveRequest = useMutation({
    mutationFn: async (request: Omit<LeaveRequest, "id" | "created_at" | "staff" | "approved_by" | "approved_at" | "rejection_reason">) => {
      const { data, error } = await db.from("leave_requests").insert(request).select().single();
      if (error) throw error;

      // Update pending days in balance
      const { data: balance } = await db.from("leave_balances")
        .select("pending_days")
        .eq("staff_id", request.staff_id)
        .eq("leave_type", request.leave_type)
        .eq("year", new Date().getFullYear())
        .maybeSingle();

      if (balance) {
        await db.from("leave_balances")
          .update({ pending_days: (balance.pending_days || 0) + request.days_requested })
          .eq("staff_id", request.staff_id)
          .eq("leave_type", request.leave_type)
          .eq("year", new Date().getFullYear());
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });

  const approveLeave = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { data: request } = await db.from("leave_requests").select("*").eq("id", id).single();
      
      const { data, error } = await db
        .from("leave_requests")
        .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Update balance: move from pending to used
      if (request) {
        const { data: balance } = await db.from("leave_balances")
          .select("*")
          .eq("staff_id", request.staff_id)
          .eq("leave_type", request.leave_type)
          .eq("year", new Date().getFullYear())
          .single();

        if (balance) {
          await db.from("leave_balances").update({
            pending_days: Math.max(0, balance.pending_days - request.days_requested),
            used_days: balance.used_days + request.days_requested,
          }).eq("id", balance.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });

  const rejectLeave = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: request } = await db.from("leave_requests").select("*").eq("id", id).single();
      
      const { data, error } = await db
        .from("leave_requests")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Remove from pending
      if (request) {
        const { data: balance } = await db.from("leave_balances")
          .select("*")
          .eq("staff_id", request.staff_id)
          .eq("leave_type", request.leave_type)
          .eq("year", new Date().getFullYear())
          .single();

        if (balance) {
          await db.from("leave_balances").update({
            pending_days: Math.max(0, balance.pending_days - request.days_requested),
          }).eq("id", balance.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    },
  });

  return { ...query, createLeaveRequest, approveLeave, rejectLeave };
}

// ============= Leave Balances =============
export function useLeaveBalances(staffId?: string) {
  return useQuery({
    queryKey: ["leave-balances", staffId],
    queryFn: async () => {
      let q = db
        .from("leave_balances")
        .select("*")
        .eq("year", new Date().getFullYear());

      if (staffId) q = q.eq("staff_id", staffId);

      const { data, error } = await q;
      if (error) throw error;
      return data as LeaveBalance[];
    },
  });
}

// ============= Payroll =============
export function usePayrollRecords(filters?: { status?: string; startDate?: string; endDate?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["payroll-records", filters],
    queryFn: async () => {
      let q = db
        .from("payroll_records")
        .select(`*, staff:staff_members(first_name, last_name, employee_id)`)
        .order("pay_period_end", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.startDate) q = q.gte("pay_period_start", filters.startDate);
      if (filters?.endDate) q = q.lte("pay_period_end", filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data as PayrollRecord[];
    },
  });

  const createPayroll = useMutation({
    mutationFn: async (record: Omit<PayrollRecord, "id" | "created_at" | "staff">) => {
      const { data, error } = await db.from("payroll_records").insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll-records"] }),
  });

  const approvePayroll = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.from("payroll_records").update({ status: "approved" }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll-records"] }),
  });

  const markPayrollPaid = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const { data, error } = await db
        .from("payroll_records")
        .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0], payment_method: paymentMethod })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll-records"] }),
  });

  return { ...query, createPayroll, approvePayroll, markPayrollPaid };
}

// ============= Time Clock =============
export function useTimeClock(date?: string) {
  const queryClient = useQueryClient();
  const targetDate = date || new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["time-clock", targetDate],
    queryFn: async () => {
      const { data, error } = await db
        .from("staff_time_clock")
        .select(`*, staff:staff_members(first_name, last_name)`)
        .gte("clock_in", `${targetDate}T00:00:00`)
        .lt("clock_in", `${targetDate}T23:59:59`)
        .order("clock_in", { ascending: false });
      if (error) throw error;
      return data as TimeClockEntry[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("time-clock-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_time_clock" }, () => {
        queryClient.invalidateQueries({ queryKey: ["time-clock"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, targetDate]);

  const clockIn = useMutation({
    mutationFn: async (staffId: string) => {
      const { data, error } = await db.from("staff_time_clock").insert({ staff_id: staffId, clock_in: new Date().toISOString() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-clock"] }),
  });

  const clockOut = useMutation({
    mutationFn: async ({ id, breakMinutes }: { id: string; breakMinutes?: number }) => {
      const { data, error } = await db
        .from("staff_time_clock")
        .update({ clock_out: new Date().toISOString(), break_minutes: breakMinutes || 0 })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-clock"] }),
  });

  return { ...query, clockIn, clockOut };
}

// ============= HR Stats =============
export function useHRStats() {
  const { data: leaveRequests } = useLeaveRequests();
  const { data: payroll } = usePayrollRecords();
  const today = new Date().toISOString().split("T")[0];
  const { data: timeClock } = useTimeClock(today);

  return {
    pendingLeaveRequests: leaveRequests?.filter((r) => r.status === "pending").length || 0,
    approvedLeaveRequests: leaveRequests?.filter((r) => r.status === "approved").length || 0,
    pendingPayroll: payroll?.filter((p) => p.status === "draft" || p.status === "approved").length || 0,
    totalPayrollAmount: payroll?.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.net_pay, 0) || 0,
    clockedInToday: timeClock?.filter((t) => !t.clock_out).length || 0,
    totalStaffToday: timeClock?.length || 0,
  };
}
