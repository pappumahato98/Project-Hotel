import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2, RefreshCw, Workflow, FileCheck, Globe, Database, Shield, Clock, AlertCircle } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";

export interface ModuleConfigSettings {
  // Global Posting Rules
  auto_post_folios: boolean;
  enforce_reference_numbers: boolean;
  allow_reversing_entries: boolean;
  // Approval Thresholds
  single_expense_limit: number;
  manager_approval_threshold: number;
  // Exchange Rate Settings
  exchange_rate_source: string;
  auto_sync_rates: boolean;
  rate_sync_frequency: string;
  // System Behavior
  default_currency: string;
  fiscal_year_start_month: number;
  lock_period_on_close: boolean;
  require_audit_notes: boolean;
}

const defaultModuleConfig: ModuleConfigSettings = {
  auto_post_folios: true,
  enforce_reference_numbers: true,
  allow_reversing_entries: false,
  single_expense_limit: 500,
  manager_approval_threshold: 5000,
  exchange_rate_source: "oanda",
  auto_sync_rates: true,
  rate_sync_frequency: "daily",
  default_currency: "USD",
  fiscal_year_start_month: 1,
  lock_period_on_close: true,
  require_audit_notes: false,
};

export function ConfigureModuleCard() {
  const { data: config, isLoading } = useSettings<ModuleConfigSettings>("module_config", defaultModuleConfig);
  const updateConfig = useUpdateSettings<ModuleConfigSettings>("module_config");

  const handleChange = <K extends keyof ModuleConfigSettings>(key: K, value: ModuleConfigSettings[K]) => {
    if (config) {
      updateConfig.mutate({ ...config, [key]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" /> Module Configuration
        </h2>
        <p className="text-muted-foreground text-sm">
          Configure system-wide behaviors for posting, approvals, and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Global Posting Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" /> Global Posting Rules
            </CardTitle>
            <CardDescription className="text-xs">
              Control how transactions are posted to the general ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Auto-Post Guest Folios</Label>
                <p className="text-xs text-muted-foreground">Post folio charges to GL on checkout.</p>
              </div>
              <Switch
                checked={config?.auto_post_folios ?? true}
                onCheckedChange={(v) => handleChange("auto_post_folios", v)}
                disabled={updateConfig.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Enforce Reference Numbers</Label>
                <p className="text-xs text-muted-foreground">Require references for manual journals.</p>
              </div>
              <Switch
                checked={config?.enforce_reference_numbers ?? true}
                onCheckedChange={(v) => handleChange("enforce_reference_numbers", v)}
                disabled={updateConfig.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Allow Reversing Entries</Label>
                <p className="text-xs text-muted-foreground">Enable one-click reversal for posted entries.</p>
              </div>
              <Switch
                checked={config?.allow_reversing_entries ?? false}
                onCheckedChange={(v) => handleChange("allow_reversing_entries", v)}
                disabled={updateConfig.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Approval Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" /> Approval Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              Define monetary limits that trigger approval workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Single Expense Limit (No Approval)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={config?.single_expense_limit ?? 500}
                  onChange={(e) => handleChange("single_expense_limit", Number(e.target.value))}
                  className="w-32"
                  disabled={updateConfig.isPending}
                />
              </div>
              <p className="text-xs text-muted-foreground">Expenses below this require no approval.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Manager Approval Required Above</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={config?.manager_approval_threshold ?? 5000}
                  onChange={(e) => handleChange("manager_approval_threshold", Number(e.target.value))}
                  className="w-32"
                  disabled={updateConfig.isPending}
                />
              </div>
              <p className="text-xs text-muted-foreground">Expenses above this need manager sign-off.</p>
            </div>
          </CardContent>
        </Card>

        {/* Exchange Rate Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Exchange Rate Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Configure currency conversion sources and sync behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Rate Source</Label>
              <Select
                value={config?.exchange_rate_source ?? "oanda"}
                onValueChange={(v) => handleChange("exchange_rate_source", v)}
                disabled={updateConfig.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oanda">OANDA FX Data</SelectItem>
                  <SelectItem value="ecb">European Central Bank</SelectItem>
                  <SelectItem value="manual">Manual Entry Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Auto-Sync Rates</Label>
                <p className="text-xs text-muted-foreground">Automatically fetch latest rates.</p>
              </div>
              <Switch
                checked={config?.auto_sync_rates ?? true}
                onCheckedChange={(v) => handleChange("auto_sync_rates", v)}
                disabled={updateConfig.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Sync Frequency</Label>
              <Select
                value={config?.rate_sync_frequency ?? "daily"}
                onValueChange={(v) => handleChange("rate_sync_frequency", v)}
                disabled={updateConfig.isPending || !config?.auto_sync_rates}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" disabled={updateConfig.isPending}>
              <RefreshCw className="h-3 w-3 mr-2" /> Force Sync Now
            </Button>
          </CardContent>
        </Card>

        {/* System Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> System Behavior
            </CardTitle>
            <CardDescription className="text-xs">
              Global settings for accounting periods and defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Default Currency</Label>
              <Select
                value={config?.default_currency ?? "USD"}
                onValueChange={(v) => handleChange("default_currency", v)}
                disabled={updateConfig.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Fiscal Year Starts</Label>
              <Select
                value={String(config?.fiscal_year_start_month ?? 1)}
                onValueChange={(v) => handleChange("fiscal_year_start_month", Number(v))}
                disabled={updateConfig.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Lock Period on Close</Label>
                <p className="text-xs text-muted-foreground">Prevent edits to closed periods.</p>
              </div>
              <Switch
                checked={config?.lock_period_on_close ?? true}
                onCheckedChange={(v) => handleChange("lock_period_on_close", v)}
                disabled={updateConfig.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Require Audit Notes</Label>
                <p className="text-xs text-muted-foreground">Force notes on sensitive changes.</p>
              </div>
              <Switch
                checked={config?.require_audit_notes ?? false}
                onCheckedChange={(v) => handleChange("require_audit_notes", v)}
                disabled={updateConfig.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Footer */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
            <Badge variant="outline" className="text-success border-success/20">
              <Shield className="h-3 w-3 mr-1" /> All Systems Operational
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
