import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface MessageTemplate {
  id: string;
  name: string;
  trigger_type: string;
  channel: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export function useMessageTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await db
        .from("message_templates")
        .select("*")
        .order("trigger_type", { ascending: true });
      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (tpl: Omit<MessageTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db.from("message_templates").insert(tpl).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await db.from("message_templates").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template updated");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template deleted");
    },
  });

  return { ...query, createTemplate, updateTemplate, deleteTemplate };
}
