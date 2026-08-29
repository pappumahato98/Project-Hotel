import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  Key,
  UserCheck,
  Eye,
  AlertTriangle,
  Fingerprint,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SecurityLayerService({ isReadOnly }: { isReadOnly?: boolean }) {
  const [policies] = useState([
    { name: 'Maker-Checker Enforcement', status: 'Enabled', level: 'Critical' },
    { name: 'MFA for P&L Access', status: 'Enabled', level: 'High' },
    { name: 'IP Whitelisting (Admin)', status: 'Enabled', level: 'Medium' },
    { name: 'Audit Log Immutability', status: 'Optimal', level: 'Critical' },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> Active Compliance Policies
            </CardTitle>
            <CardDescription>Security rules applied to financial transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {policies.map((policy, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-background rounded-md">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">{policy.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "text-[9px]",
                    policy.level === 'Critical' ? "text-destructive border-destructive/20" : "text-amber-500 border-amber-500/20"
                  )}>{policy.level.toUpperCase()}</Badge>
                  <span className="text-[10px] font-bold text-success">{policy.status.toUpperCase()}</span>
                </div>
              </div>
            ))}
            {!isReadOnly && (
              <Button className="w-full text-xs gap-2" variant="outline">
                <Settings className="h-3 w-3" /> Policy Manager
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
               <div>
                 <CardTitle className="text-sm font-medium">Authentication Analytics</CardTitle>
                 <CardDescription>Identity and access verification stats</CardDescription>
               </div>
               <Fingerprint className="h-5 w-5 text-primary opacity-50" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">MFA Adoption</p>
                   <p className="text-xl font-bold">100%</p>
                   <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-success" style={{ width: '100%' }} />
                   </div>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">Session Hijacks</p>
                   <p className="text-xl font-bold">0</p>
                   <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-success" style={{ width: '0%' }} />
                   </div>
                </div>
             </div>

             <div className="space-y-3">
                <h4 className="text-xs font-semibold">Security Events (Last 24h)</h4>
                {[
                  { event: 'MFA Success', user: 'FA_John', time: '5m ago', icon: UserCheck, color: 'text-success' },
                  { event: 'Role Change', user: 'Admin_Sarah', time: '1h ago', icon: Key, color: 'text-amber-500' },
                  { event: 'Sensitive Export', user: 'FC_Mike', time: '3h ago', icon: Eye, color: 'text-primary' },
                  { event: 'Failed Attempt', user: 'IP: 192.168.1.1', time: '12h ago', icon: AlertTriangle, color: 'text-destructive' },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-[11px]">
                     <div className="flex items-center gap-2">
                        <ev.icon className={cn("h-3.5 w-3.5", ev.color)} />
                        <span className="font-medium">{ev.event}</span>
                     </div>
                     <span className="text-muted-foreground">{ev.user}</span>
                     <span className="text-[10px] font-mono">{ev.time}</span>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
