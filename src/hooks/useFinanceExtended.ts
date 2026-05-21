import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============= Types =============
export interface Invoice {
  id: string;
  invoice_number: string;
  guest_id: string | null;
  reservation_id: string | null;
  company_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  guest?: { first_name: string; last_name: string };
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string | null;
  reservation_id: string | null;
  guest_id: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  account_id: string | null;
  status: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface TaxRate {
  id: string;
  name: string;
  code: string;
  rate: number;
  is_default: boolean;
  is_active: boolean;
  applies_to: string[];
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= Invoices =============
export function useInvoices(filters?: { status?: string; startDate?: string; endDate?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      let q = db
        .from("invoices")
        .select(`*, guest:guests(first_name, last_name), items:invoice_items(*)`)
        .order("invoice_date", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.startDate) q = q.gte("invoice_date", filters.startDate);
      if (filters?.endDate) q = q.lte("invoice_date", filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async ({ items, ...invoice }: Omit<Invoice, "id" | "created_at" | "invoice_number" | "guest" | "items"> & { items: Omit<InvoiceItem, "id" | "invoice_id">[] }) => {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      
      // Calculate totals
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0);
      const total = subtotal + taxAmount - (invoice.discount_amount || 0);
      const balanceDue = total - (invoice.amount_paid || 0);

      const { data: inv, error: invError } = await db
        .from("invoices")
        .insert({ ...invoice, invoice_number: invoiceNumber, subtotal, tax_amount: taxAmount, total, balance_due: balanceDue })
        .select()
        .single();
      if (invError) throw invError;

      const invItems = items.map((i) => ({ ...i, invoice_id: inv.id }));
      const { error: itemsError } = await db.from("invoice_items").insert(invItems);
      if (itemsError) throw itemsError;

      return inv;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await db.from("invoices").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  return { ...query, createInvoice, updateInvoiceStatus };
}

// ============= Payments =============
export function usePayments(filters?: { startDate?: string; endDate?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["payments", filters],
    queryFn: async () => {
      let q = db
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (filters?.startDate) q = q.gte("payment_date", filters.startDate);
      if (filters?.endDate) q = q.lte("payment_date", filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data as Payment[];
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (payment: Omit<Payment, "id" | "created_at" | "payment_number">) => {
      const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await db.from("payments").insert({ ...payment, payment_number: paymentNumber }).select().single();
      if (error) throw error;

      // Update invoice if linked
      if (payment.invoice_id) {
        const { data: invoice } = await db.from("invoices").select("amount_paid, total").eq("id", payment.invoice_id).single();
        if (invoice) {
          const newAmountPaid = invoice.amount_paid + payment.amount;
          const newBalanceDue = invoice.total - newAmountPaid;
          const newStatus = newBalanceDue <= 0 ? "paid" : newBalanceDue < invoice.total ? "partial" : "sent";
          await db.from("invoices").update({ amount_paid: newAmountPaid, balance_due: newBalanceDue, status: newStatus }).eq("id", payment.invoice_id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  return { ...query, recordPayment };
}

// ============= Expenses =============
export function useExpenses(filters?: { status?: string; category?: string; startDate?: string; endDate?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      let q = db
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.startDate) q = q.gte("expense_date", filters.startDate);
      if (filters?.endDate) q = q.lte("expense_date", filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return data as Expense[];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (expense: Omit<Expense, "id" | "created_at" | "expense_number">) => {
      const expenseNumber = `EXP-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await db.from("expenses").insert({ ...expense, expense_number: expenseNumber }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const approveExpense = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { data, error } = await db
        .from("expenses")
        .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const markExpensePaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db
        .from("expenses")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  return { ...query, createExpense, approveExpense, markExpensePaid };
}

// ============= Tax Rates =============
export function useTaxRates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tax-rates"],
    queryFn: async () => {
      const { data, error } = await db
        .from("tax_rates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as TaxRate[];
    },
  });

  const createTaxRate = useMutation({
    mutationFn: async (rate: Omit<TaxRate, "id" | "created_at">) => {
      const { data, error } = await db.from("tax_rates").insert(rate).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tax-rates"] }),
  });

  const updateTaxRate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaxRate> & { id: string }) => {
      const { data, error } = await db.from("tax_rates").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tax-rates"] }),
  });

  return { ...query, createTaxRate, updateTaxRate };
}

// ============= Financial Stats =============
export function useFinancialStats(period?: { start: string; end: string }) {
  const start = period?.start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const end = period?.end || new Date().toISOString().split("T")[0];

  const { data: invoices } = useInvoices({ startDate: start, endDate: end });
  const { data: payments } = usePayments({ startDate: start, endDate: end });
  const { data: expenses } = useExpenses({ startDate: start, endDate: end });

  const totalRevenue = invoices?.reduce((sum, i) => sum + i.total, 0) || 0;
  const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalExpenses = expenses?.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0) || 0;
  const outstandingReceivables = invoices?.filter((i) => i.status !== "paid").reduce((sum, i) => sum + i.balance_due, 0) || 0;
  const pendingExpenses = expenses?.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0) || 0;

  return {
    totalRevenue,
    totalCollected,
    totalExpenses,
    netIncome: totalCollected - totalExpenses,
    outstandingReceivables,
    pendingExpenses,
    invoiceCount: invoices?.length || 0,
    paymentCount: payments?.length || 0,
    expenseCount: expenses?.length || 0,
  };
}
