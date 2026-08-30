import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Network,
  Activity,
  ShieldAlert,
  Zap,
  Globe,
  Settings,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export function APIGatewayService({ isReadOnly }: { isReadOnly?: boolean }) {
  const [endpoints] = useState([
    { path: '/v1/journals', method: 'POST', latency: '42ms', status: '200 OK', rate: '12/min' },
    { path: '/v1/accounts', method: 'GET', latency: '15ms', status: '200 OK', rate: '145/min' },
    { path: '/v1/reports/pnl', method: 'GET', latency: '1.2s', status: '200 OK', rate: '2/min' },
    { path: '/v1/auth/mfa', method: 'POST', latency: '85ms', status: '401 UNAUTH', rate: '45/min' },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Uptime', value: '99.998%', color: 'text-success' },
          { label: 'Avg Latency', value: '24ms', color: 'text-primary' },
          { label: 'Active Keys', value: '142', color: 'text-primary' },
          { label: 'Blocked IPs', value: '12', color: 'text-destructive' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
               <p className="text-[10px] uppercase font-bold text-muted-foreground">{stat.label}</p>
               <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Endpoint Monitor</CardTitle>
            <CardDescription>Live telemetry for financial API endpoints</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead className="bg-muted/50 border-y">
                   <tr>
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground">Endpoint</th>
                     <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                     <th className="text-right px-4 py-3 font-medium text-muted-foreground">Latency</th>
                     <th className="text-right px-4 py-3 font-medium text-muted-foreground">Throughput</th>
                   </tr>
                 </thead>
                 <tbody>
                   {endpoints.map((ep, i) => (
                     <tr key={i} className="border-b hover:bg-secondary/20 transition-colors">
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className={cn(
                             "text-[9px] font-mono",
                             ep.method === 'POST' ? "text-blue-500 border-blue-500/20" : "text-success border-success/20"
                           )}>{ep.method}</Badge>
                           <span className="font-mono text-xs">{ep.path}</span>
                         </div>
                       </td>
                       <td className="px-4 py-3">
                         <span className={cn(
                           "text-xs font-medium",
                           ep.status.startsWith('200') ? "text-success" : "text-destructive"
                         )}>{ep.status}</span>
                       </td>
                       <td className="px-4 py-3 text-right font-mono text-xs">{ep.latency}</td>
                       <td className="px-4 py-3 text-right text-xs">{ep.rate}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gateway Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded border bg-background">
                   <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">WAF Protection</span>
                   </div>
                   <Badge variant="outline" className="text-success border-success/20">ENABLED</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-background">
                   <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium">Caching</span>
                   </div>
                   <Badge variant="outline" className="text-success border-success/20">ACTIVE</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-background">
                   <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium">CORS Policy</span>
                   </div>
                   <Badge variant="outline">STRICT</Badge>
                </div>
             </div>

             <div className="pt-2 space-y-2">
                {!isReadOnly && (
                   <>
                    <Button size="sm" className="w-full gap-2">
                       <Lock className="h-3 w-3" /> Rotate API Master Key
                    </Button>
                    <Button size="sm" variant="outline" className="w-full gap-2">
                       <Settings className="h-3 w-3" /> Configure Rate Limits
                    </Button>
                   </>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
