import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: string;
  position: string;
  hire_date: string;
  status: string;
  salary: number | null;
  notes: string | null;
}

export const useStaffMembers = () => {
  return useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data as unknown as StaffMember[];
    },
  });
};

export const useStaffDepartments = () => {
  return useQuery({
    queryKey: ["staff-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("department")
        .order("department", { ascending: true });
      if (error) throw error;
      const unique = [...new Set((data as any[]).map(d => d.department))];
      return unique as string[];
    },
  });
};
