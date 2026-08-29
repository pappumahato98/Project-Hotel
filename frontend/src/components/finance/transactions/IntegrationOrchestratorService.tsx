/**
 * Integration Orchestrator View (presentation only).
 * Refactored to consume useIntegrationOrchestratorView.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Database,
  Activity,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntegrationOrchestratorView } from "@/hooks/finance/useIntegrationOrchestratorView";

const ICONS = [Database, Zap, ArrowRightLeft, Activity];

export function IntegrationOrchestratorService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { events, integrations, syncedCount, pendingCount } = useIntegrationOrchestratorView();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Integration Status</CardTitle>
            <CardDescription>Data flow between accounting sub-modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.map((int, idx) => {
              const Icon = ICONS[idx] || Database;
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-md">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-[10px] text-muted-foreground">{int.count} records</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    int.status === 'Active' ? "bg-success/10 text-success border-success/20" : "bg-muted"
                  )}>
                    {int.status}
                  </Badge>
                </div>
              );
            })}
            {!isReadOnly && (
              <Button className="w-full mt-2" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh All
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Financial Event Stream</CardTitle>
                <CardDescription>Recent postings across all modules</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{syncedCount} synced</Badge>
                {pendingCount > 0 && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20 text-[10px]">{pendingCount} pending</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px] space-y-4 pr-2">
            {events.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No financial events yet. Create invoices, payments, or expenses to see them here.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="relative pl-4 border-l-2 border-primary/20 pb-4 last:pb-0">
                  <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{event.source}</Badge>
                      <span className="text-xs font-semibold">{event.type}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {event.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{event.details}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold">
                      {event.amount > 0 ? `$${event.amount.toFixed(2)}` : '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      {event.status === 'synced' ? (
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      ) : (
                        <Clock className="h-3 w-3 text-amber-500" />
                      )}
                      <span className={cn(
                        "text-[10px] font-medium",
                        event.status === 'synced' ? "text-success" : "text-amber-500"
                      )}>
                        {event.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
