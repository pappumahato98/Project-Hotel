import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Activity,
  RefreshCw,
  AlertCircle,
  BarChart3,
  ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventSubscriber {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  eventsProcessed: number;
}

export function EventBusService({ isReadOnly }: { isReadOnly?: boolean }) {
  const [subscribers] = useState<EventSubscriber[]>([
    { id: '1', name: 'Journal Posting Engine', type: 'CORE', status: 'active', eventsProcessed: 12450 },
    { id: '2', name: 'Audit Logger', type: 'SYSTEM', status: 'active', eventsProcessed: 45200 },
    { id: '3', name: 'Dashboard Analytics', type: 'WEBHOOK', status: 'active', eventsProcessed: 8900 },
    { id: '4', name: 'External Tax Sync', type: 'API', status: 'inactive', eventsProcessed: 2100 },
  ]);

  const [realtimeTraffic, setRealtimeTraffic] = useState<number[]>(
    Array.from({ length: 20 }, () => Math.floor(Math.random() * 50) + 10)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeTraffic(prev => [...prev.slice(1), Math.floor(Math.random() * 50) + 10]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Event Traffic (Last 60s)</CardTitle>
              <CardDescription>Real-time event throughput across the financial bus</CardDescription>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1 px-2">
              {realtimeTraffic.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 rounded-t-sm transition-all duration-500 hover:bg-primary/40"
                  style={{ height: `${(value / 60) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Peak Rate</p>
                <p className="text-sm font-bold">58 req/s</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg Latency</p>
                <p className="text-sm font-bold">14ms</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Error Rate</p>
                <p className="text-sm font-bold">0.02%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Today</p>
                <p className="text-sm font-bold">1.2M</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bus Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 border space-y-2">
               <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Protocol</span>
                  <span className="font-mono">gRPC / Protobuf</span>
               </div>
               <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Persistence</span>
                  <span className="text-success">Durable (3 Nodes)</span>
               </div>
               <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Retention</span>
                  <span>7 Days</span>
               </div>
            </div>
            <Button className="w-full text-xs gap-2" variant="outline" size="sm">
               <RefreshCw className="h-3 w-3" /> Flush Dead Letter Queue
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Event Subscribers</CardTitle>
            <CardDescription>Active services listening for financial events</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ListFilter className="h-4 w-4" />
            </Button>
            {!isReadOnly && (
              <Button size="sm" className="h-8 gap-1">
                <Zap className="h-3 w-3" /> New Trigger
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-y">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subscriber Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Events Processed</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b hover:bg-secondary/20 transition-colors group">
                    <td className="px-4 py-3 font-medium">{sub.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{sub.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={cn(
                        sub.status === 'active' ? "text-success border-success/20 bg-success/5" : "text-muted-foreground"
                      )}>
                        {sub.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{sub.eventsProcessed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Configure
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 p-4 rounded-lg border bg-amber-500/5 border-amber-500/10">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700/80 leading-relaxed">
          <span className="font-bold">Operational Alert:</span> The 'External Tax Sync' subscriber is currently offline.
          Pending events are being buffered in the retry queue. Last successful heartbeat: 2 hours ago.
        </p>
      </div>
    </div>
  );
}
