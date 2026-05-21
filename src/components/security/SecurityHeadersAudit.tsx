import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeaderAuditResult, RiskLevel } from "@/utils/securityHeaders";

interface SecurityHeadersAuditProps {
  headers: HeaderAuditResult[];
  loading: boolean;
  onRefresh: () => void;
}

const riskColors: Record<RiskLevel, string> = {
  critical: 'text-red-500 border-red-500/30 bg-red-500/10',
  high: 'text-orange-500 border-orange-500/30 bg-orange-500/10',
  medium: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  low: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
};

export function SecurityHeadersAudit({ headers, loading, onRefresh }: SecurityHeadersAuditProps) {
  const passedCount = headers.filter(h => h.passed).length;
  const totalCount = headers.length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div
          className={cn("h-full transition-all duration-1000 ease-out",
            passRate === 100 ? "bg-emerald-500" : passRate >= 70 ? "bg-amber-500" : "bg-destructive"
          )}
          style={{ width: `${passRate}%` }}
        />
      </div>
      <CardHeader className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Security Headers Audit</CardTitle>
              <CardDescription className="text-[11px]">{passedCount}/{totalCount} headers configured</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] font-bold",
              passRate === 100 ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"
            )}>{passRate}% PASS</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : headers.map((header) => (
          <div key={header.header} className={cn("flex items-start gap-3 p-3 rounded-lg border transition-all",
            header.passed ? "border-emerald-500/10 bg-emerald-500/5" : "border-destructive/10 bg-destructive/5"
          )}>
            <div className="mt-0.5">
              {header.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold font-mono">{header.header}</span>
                <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 h-4", riskColors[header.riskLevel])}>
                  {header.riskLevel.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{header.description}</p>
              {!header.passed && (
                <div className="flex items-center gap-1.5 mt-1 p-1.5 rounded bg-background/50 border border-dashed border-destructive/20">
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                  <span className="text-[9px] text-destructive font-medium">Missing — Add via server config or meta tag</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
