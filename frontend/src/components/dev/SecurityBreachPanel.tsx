import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, AlertCircle, Loader2, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

export const SecurityBreachPanel = () => {
  useAdminRealtime();
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["security-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .or("action.ilike.%security%,action.ilike.%fail%,action.ilike.%unauthorized%,action.ilike.%login%")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;
      return data;
    }
  });

  const threatLevel = auditLogs && auditLogs.length > 10 ? "High" : auditLogs && auditLogs.length > 5 ? "Elevated" : "Low";
  const threatColor = threatLevel === "High" ? "text-destructive" : threatLevel === "Elevated" ? "text-warning" : "text-success";

  return (
    <div className="space-y-6">
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2 uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" /> Current Threat Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold uppercase ${threatColor}`}>{threatLevel}</div>
          <p className="text-xs text-muted-foreground mt-1">Based on recent authentication and authorization events</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" /> Security Event Log
              </CardTitle>
              <CardDescription>Real-time security monitoring from audit trails</CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              Live
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">No recent security events detected.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-background border border-border">
                      {log.action.toLowerCase().includes('login') ? <Lock className="h-3.5 w-3.5 text-primary" /> : <ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4 border-warning/50 text-warning px-1">
                          {log.action}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-medium">{log.entity_type}: {log.entity_id?.slice(0, 8) || 'System Action'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono">
                    {log.ip_address || 'Internal'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
