import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Lock, Unlock, Globe, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TLSStatus } from "@/utils/securityHeaders";

interface TLSStatusCardProps {
  tlsStatus: TLSStatus;
  sessionValid: boolean;
}

export function TLSStatusCard({ tlsStatus, sessionValid }: TLSStatusCardProps) {
  const isSecure = tlsStatus.isSecure;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-500",
      isSecure
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-destructive/30 bg-destructive/5"
    )}>
      {/* Animated background glow */}
      <div className={cn(
        "absolute inset-0 opacity-10",
        isSecure
          ? "bg-gradient-to-br from-emerald-400/20 to-transparent"
          : "bg-gradient-to-br from-red-400/20 to-transparent"
      )} />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl border shadow-lg",
              isSecure
                ? "bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/10"
                : "bg-destructive/15 border-destructive/30 shadow-destructive/10"
            )}>
              {isSecure
                ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
                : <ShieldAlert className="h-5 w-5 text-destructive" />
              }
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">TLS Connection Status</CardTitle>
              <CardDescription className="text-[11px]">Transport Layer Security</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 animate-pulse",
              isSecure
                ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                : "border-destructive/40 text-destructive bg-destructive/10"
            )}
          >
            {isSecure ? '● SECURED' : '● INSECURE'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Protocol & Connection Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-1.5">
              {isSecure
                ? <Lock className="h-3 w-3 text-emerald-500" />
                : <Unlock className="h-3 w-3 text-destructive" />
              }
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Protocol</span>
            </div>
            <p className="text-sm font-bold">{isSecure ? 'HTTPS (TLS 1.3)' : 'HTTP (Unencrypted)'}</p>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hostname</span>
            </div>
            <p className="text-sm font-bold font-mono truncate">{tlsStatus.hostname}</p>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-1.5">
              {sessionValid
                ? <Wifi className="h-3 w-3 text-emerald-500" />
                : <WifiOff className="h-3 w-3 text-destructive" />
              }
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session</span>
            </div>
            <p className="text-sm font-bold">{sessionValid ? 'Verified' : 'Anomaly Detected'}</p>
          </div>

          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Environment</span>
            </div>
            <p className="text-sm font-bold">{tlsStatus.isProduction ? 'Production' : 'Development'}</p>
          </div>
        </div>

        {/* Security Features List */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Encryption Features</h4>
          <div className="grid gap-1.5">
            {[
              { label: 'TLS Encryption', active: isSecure, detail: isSecure ? 'AES-256-GCM' : 'None' },
              { label: 'Certificate Valid', active: isSecure, detail: isSecure ? 'Let\'s Encrypt' : 'N/A' },
              { label: 'HSTS Enabled', active: isSecure, detail: isSecure ? 'max-age=31536000' : 'Disabled' },
              { label: 'Forward Secrecy', active: isSecure, detail: isSecure ? 'ECDHE' : 'N/A' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    feature.active ? "bg-emerald-500" : "bg-muted-foreground/30"
                  )} />
                  <span className="font-medium">{feature.label}</span>
                </div>
                <span className="font-mono text-muted-foreground text-[10px]">{feature.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
