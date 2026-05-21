import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketingInquiry {
  id: string;
  created_at: string;
  client_name: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  inquiry_source: string;
  inquiry_type: string;
  preferred_dates: any;
  estimated_guests: number;
  status: string;
  assigned_to: string;
  notes: string;
}

export interface SalesActivity {
  id: string;
  created_at: string;
  activity_date: string;
  activity_type: string;
  account_name: string;
  contact_person: string;
  purpose: string;
  outcome: string;
  next_follow_up: string;
  performed_by: string;
  notes: string;
}

export const useMarketing = () => {
  const queryClient = useQueryClient();

  const inquiries = useQuery({
    queryKey: ["marketing_inquiries"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingInquiry[];
    },
  });

  const salesActivities = useQuery({
    queryKey: ["sales_activities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_activities")
        .select("*")
        .order("activity_date", { ascending: false });
      if (error) throw error;
      return data as SalesActivity[];
    },
  });

  const createInquiry = useMutation({
    mutationFn: async (inquiry: Partial<MarketingInquiry>) => {
      const { data, error } = await (supabase as any)
        .from("marketing_inquiries")
        .insert([inquiry])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_inquiries"] });
      toast.success("Inquiry created successfully");
    },
  });

  const createActivity = useMutation({
    mutationFn: async (activity: Partial<SalesActivity>) => {
      const { data, error } = await (supabase as any)
        .from("sales_activities")
        .insert([activity])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      toast.success("Sales activity logged");
    },
  });

  return {
    inquiries,
    salesActivities,
    createInquiry,
    createActivity,
  };
};
