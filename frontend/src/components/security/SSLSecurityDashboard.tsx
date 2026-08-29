import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldCheck, Lock, Key, UserCheck, AlertTriangle, Eye, Fingerprint, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSecurityMonitor } from "@/hooks/useSecurityMonitor";
import { TLSStatusCard } from "./TLSStatusCard";
import { SecurityHeadersAudit } from "./SecurityHeadersAudit";

export function SSLSecurityDashboard() {
  const {
    tlsStatus, headerAudit, headersLoading, securityScore, securityGrade,
    authMetrics, authMetricsLoading, securityEvents, eventsLoading,
    threatLevel, sessionValid, refreshAudit,
  } = useSecurityMonitor();

  const threatColors: Record<string, string> = {
    Low: 'text-emerald-500', Elevated: 'text-amber-500', High: 'text-orange-500', Critical: 'text-red-500',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Score Banner */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-background via-secondary/30 to-background p-6">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={cn("relative flex items-center justify-center w-20 h-20 rounded-2xl border-2 shadow-xl",
              securityScore >= 80 ? "border-emerald-500/50 shadow-emerald-500/10 bg-emerald-500/10"
                : securityScore >= 60 ? "border-amber-500/50 shadow-amber-500/10 bg-amber-500/10"
                  : "border-destructive/50 shadow-destructive/10 bg-destructive/10"
            )}>
              <div className="text-center">
                <p className={cn("text-2xl font-black", securityGrade.color)}>{securityGrade.grade}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{securityScore}/100</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> SSL/TLS Security Dashboard
              </h2>
              <p className="text-sm text-muted-foreground">Real-time transport security monitoring & compliance audit</p>
              <div className="flex items-center gap-3 pt-1">
                <Badge variant="outline" className={cn("text-[10px]", securityGrade.color)}>
                  {securityGrade.label}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px]", threatColors[threatLevel])}>
                  Threat: {threatLevel}
                </Badge>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-background/50 rounded-lg border border-border/50">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", tlsStatus.isSecure ? "bg-emerald-500" : "bg-destructive")} />
            <span className="text-[11px] font-semibold">{tlsStatus.isSecure ? 'Encrypted' : 'Unencrypted'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TLS Status */}
        <TLSStatusCard tlsStatus={tlsStatus} sessionValid={sessionValid} />

        {/* Auth Security Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Fingerprint className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Authentication Security</CardTitle>
                  <CardDescription className="text-[11px]">Identity & access metrics (24h)</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Failed Logins', value: authMetricsLoading ? '—' : String(authMetrics.failedLoginAttempts), icon: AlertTriangle, color: authMetrics.failedLoginAttempts > 0 ? 'text-destructive' : 'text-emerald-500' },
                { label: 'Active Sessions', value: authMetricsLoading ? '—' : String(authMetrics.activeSessions), icon: UserCheck, color: 'text-blue-500' },
                { label: 'MFA Adoption', value: authMetricsLoading ? '—' : `${authMetrics.mfaAdoptionRate}%`, icon: Key, color: 'text-emerald-500' },
                { label: 'Session Status', value: sessionValid ? 'Valid' : 'Anomaly!', icon: Lock, color: sessionValid ? 'text-emerald-500' : 'text-destructive' },
              ].map((metric) => (
                <div key={metric.label} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <metric.icon className={cn("h-3 w-3", metric.color)} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{metric.label}</span>
                  </div>
                  <p className={cn("text-lg font-bold", metric.color)}>{metric.value}</p>
                </div>
              ))}
            </div>
            {authMetrics.lastFailedLogin && (
              <div className="flex items-center gap-2 p-2 rounded bg-destructive/5 border border-destructive/20 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-muted-foreground">Last failed: {new Date(authMetrics.lastFailedLogin).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Headers Audit - Full Width */}
      <SecurityHeadersAudit headers={headerAudit} loading={headersLoading} onRefresh={refreshAudit} />

      {/* Threat Monitor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl border",
                threatLevel === 'Low' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"
              )}>
                {threatLevel === 'Low' ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Threat Monitor</CardTitle>
                <CardDescription className="text-[11px]">Recent security events from audit trail</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                threatLevel === 'Low' ? "bg-emerald-500/10 text-emerald-500" : threatLevel === 'Elevated' ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                  threatLevel === 'Low' ? "bg-emerald-500" : threatLevel === 'Elevated' ? "bg-amber-500" : "bg-destructive"
                )} />
                {threatLevel}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex justify-center py-8"><Activity className="h-6 w-6 animate-pulse text-muted-foreground" /></div>
          ) : securityEvents.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <ShieldCheck className="h-8 w-8 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No security events detected</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {securityEvents.slice(0, 10).map((event) => (
                <div key={event.id} className={cn("flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                  event.severity === 'critical' ? "bg-destructive/5 border-destructive/20" :
                    event.severity === 'warning' ? "bg-amber-500/5 border-amber-500/20" :
                      "bg-secondary/30 border-border/50"
                )}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn("p-1 rounded",
                      event.severity === 'critical' ? "bg-destructive/15" : event.severity === 'warning' ? "bg-amber-500/15" : "bg-primary/15"
                    )}>
                      {event.severity === 'critical' ? <ShieldAlert className="h-3 w-3 text-destructive" /> :
                        event.severity === 'warning' ? <AlertTriangle className="h-3 w-3 text-amber-500" /> :
                          <Eye className="h-3 w-3 text-primary" />}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">{event.action}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{event.entity_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-muted-foreground">{event.ip_address || 'Internal'}</span>
                    <p className="text-[9px] text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
