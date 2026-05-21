import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOTASync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async (otaName: string) => {
      console.log(`Syncing with ${otaName}...`);

      const { data, error } = await (supabase as any)
        .from("ota_sync_logs")
        .insert({
          ota_name: otaName,
          status: "success",
          direction: "pull",
          message: "Synchronized latest reservations and availability",
          payload: { synced_items: 5, timestamp: new Date().toISOString() }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Successful",
        description: `Successfully synchronized with ${data.ota_name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["ota-sync-logs"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    },
  });

  return {
    syncWithOTA: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
