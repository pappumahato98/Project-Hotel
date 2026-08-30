import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

// ============= Types =============
export interface Account {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  date: string;
  description: string;
  reference: string | null;
  is_posted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  account?: Account;
}

export interface LedgerEntry {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  journal_entry_id: string;
  entry_number: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============= Accounts =============
export function useAccounts() {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");

  const query = useQuery({
    queryKey: queryKeys.finance.accounts,
    queryFn: async () => {
      const { data, error } = await db
        .from("accounts")
        .select("*")
        .order("code", { ascending: true });

      if (error) {
        console.error("Error fetching accounts:", error);
        return [];
      }

      return data as Account[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("accounts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.finance.accounts });
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

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<Account, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db
        .from("accounts")
        .insert(account)
        .select()
        .single();

      if (error) {
        console.error("Error creating account:", error);
        throw error;
      }

      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.accounts });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Account, "id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await db
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating account:", error);
        throw error;
      }

      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.accounts });
    },
  });
}

// ============= Journal Entries =============
export function useJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  isPosted?: boolean;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.finance.journalEntries.filtered(filters),
    queryFn: async () => {
      let q = db
        .from("journal_entries")
        .select(`
          *,
          journal_lines (
            *,
            account:accounts (*)
          )
        `)
        .order("date", { ascending: false });

      if (filters?.startDate) {
        q = q.gte("date", filters.startDate);
      }
      if (filters?.endDate) {
        q = q.lte("date", filters.endDate);
      }
      if (filters?.isPosted !== undefined) {
        q = q.eq("is_posted", filters.isPosted);
      }

      const { data, error } = await q;

      if (error) {
        console.error("Error fetching journal entries:", error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        ...entry,
        lines: entry.journal_lines || [],
      })) as JournalEntry[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("journal-entries-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_entries" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_lines" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      date: string;
      description: string;
      reference?: string | null;
      lines: { account_id: string; debit: number; credit: number; description?: string | null }[];
    }) => {
      const entryNumber = `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 10000
      )
        .toString()
        .padStart(4, "0")}`;

      const { data: journalEntry, error: entryError } = await db
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          date: entry.date,
          description: entry.description,
          reference: entry.reference ?? null,
          is_posted: false,
        })
        .select()
        .single();

      if (entryError) {
        console.error("Error creating journal entry:", entryError);
        throw entryError;
      }

      const lines = entry.lines.map((line) => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description ?? null,
      }));

      const { error: linesError } = await db.from("journal_lines").insert(lines);

      if (linesError) {
        console.error("Error creating journal lines:", linesError);
        throw linesError;
      }

      return journalEntry as JournalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.ledger.all });
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await db
        .from("journal_entries")
        .update({ is_posted: true })
        .eq("id", entryId)
        .select()
        .single();

      if (error) {
        console.error("Error posting journal entry:", error);
        throw error;
      }

      return data as JournalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.ledger.all });
    },
  });
}

export function useBatchPostJournalEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { data, error } = await db
        .from("journal_entries")
        .update({ is_posted: true })
        .in("id", entryIds)
        .select();

      if (error) {
        console.error("Error batch posting journal entries:", error);
        throw error;
      }

      return data as JournalEntry[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.journalEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.ledger.all });
      toast.success("Entries posted successfully");
    },
  });
}

// ============= Ledger =============
export function useLedger(
  accountId?: string,
  filters?: { startDate?: string; endDate?: string }
) {
  const query = useQuery({
    queryKey: queryKeys.finance.ledger.byAccount(accountId, filters),
    queryFn: async () => {
      let q = db
        .from("journal_lines")
        .select(`
          id,
          account_id,
          debit,
          credit,
          description,
          created_at,
          journal_entry:journal_entries!inner (
            id,
            entry_number,
            date,
            description,
            is_posted
          ),
          account:accounts (
            id,
            code,
            name,
            type
          )
        `);

      q = q.eq("journal_entry.is_posted", true);

      if (accountId) {
        q = q.eq("account_id", accountId);
      }

      if (filters?.startDate) {
        q = q.gte("journal_entry.date", filters.startDate);
      }
      if (filters?.endDate) {
        q = q.lte("journal_entry.date", filters.endDate);
      }

      const { data, error } = await q.order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching ledger:", error);
        return [];
      }

      const sortedData = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.journal_entry.date).getTime();
        const dateB = new Date(b.journal_entry.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const accountBalances: Record<string, number> = {};
      const ledgerEntries: LedgerEntry[] = [];

      for (const line of sortedData) {
        const je = line.journal_entry as any;
        const acc = line.account as any;

        if (!accountBalances[line.account_id]) {
          accountBalances[line.account_id] = 0;
        }

        const isDebitPositive = ["asset", "expense"].includes(acc?.type);
        const netChange = isDebitPositive
          ? (line.debit || 0) - (line.credit || 0)
          : (line.credit || 0) - (line.debit || 0);

        accountBalances[line.account_id] += netChange;

        ledgerEntries.push({
          id: line.id,
          account_id: line.account_id,
          account_code: acc?.code || "",
          account_name: acc?.name || "",
          date: je?.date || "",
          description: line.description || je?.description || "",
          debit: line.debit || 0,
          credit: line.credit || 0,
          running_balance: accountBalances[line.account_id],
          journal_entry_id: je?.id || "",
          entry_number: je?.entry_number || "",
        });
      }

      if (!accountId) {
        return ledgerEntries.reverse();
      }

      return ledgerEntries;
    },
    enabled: true,
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ============= Trial Balance =============
export function useTrialBalance(asOfDate?: string) {
  const query = useQuery({
    queryKey: queryKeys.finance.trialBalance(asOfDate),
    queryFn: async () => {
      let q = db
        .from("journal_lines")
        .select(`
          account_id,
          debit,
          credit,
          account:accounts (
            id,
            code,
            name,
            type
          ),
          journal_entry:journal_entries!inner (
            date,
            is_posted
          )
        `)
        .eq("journal_entry.is_posted", true);

      if (asOfDate) {
        q = q.lte("journal_entry.date", asOfDate);
      }

      const { data, error } = await q;

      if (error) {
        console.error("Error fetching trial balance:", error);
        return [];
      }

      const accountTotals: Record<
        string,
        { account: Account; totalDebit: number; totalCredit: number }
      > = {};

      for (const line of data || []) {
        const acc = line.account as unknown as Account;
        if (!acc) continue;

        if (!accountTotals[line.account_id]) {
          accountTotals[line.account_id] = {
            account: acc,
            totalDebit: 0,
            totalCredit: 0,
          };
        }

        accountTotals[line.account_id].totalDebit += line.debit || 0;
        accountTotals[line.account_id].totalCredit += line.credit || 0;
      }

      return Object.values(accountTotals).sort((a, b) =>
        a.account.code.localeCompare(b.account.code)
      );
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
