import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface GuestDocument {
  id: string;
  guest_id: string;
  document_type: string;
  document_number: string | null;
  issuing_country: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  verified: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useGuestDocuments(guestId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["guest-documents", guestId],
    queryFn: async () => {
      const { data, error } = await db
        .from("guest_documents")
        .select("*")
        .eq("guest_id", guestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GuestDocument[];
    },
    enabled: !!guestId,
  });

  const addDocument = useMutation({
    mutationFn: async (doc: Omit<GuestDocument, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db.from("guest_documents").insert(doc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-documents", guestId] });
      toast.success("Document added successfully");
    },
    onError: (e: Error) => toast.error("Failed to add document: " + e.message),
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GuestDocument> & { id: string }) => {
      const { data, error } = await db.from("guest_documents").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-documents", guestId] });
      toast.success("Document updated");
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("guest_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-documents", guestId] });
      toast.success("Document removed");
    },
  });

  return { ...query, addDocument, updateDocument, deleteDocument };
}
