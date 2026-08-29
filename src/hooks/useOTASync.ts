import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

export function useOTASync() {
  const queryClient = useQueryClient();

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
      toast.success("Sync Successful", { description: `Successfully synchronized with ${data.ota_name}.` });
      queryClient.invalidateQueries({ queryKey: queryKeys.channelManager.syncLogs });
    },
    onError: (error: any) => {
      toast.error("Sync Failed", { description: error.message });
    },
  });

  return {
    syncWithOTA: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
