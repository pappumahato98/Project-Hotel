import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Settings2,
  RefreshCw,
  Workflow,
  FileCheck,
  Globe,
  Save
} from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface FinanceConfig {
  auto_post_folios: boolean;
  enforce_reference: boolean;
  allow_reversals: boolean;
  single_expense_limit: number;
  manager_approval_threshold: number;
  exchange_source: string;
}

const defaultConfig: FinanceConfig = {
  auto_post_folios: true,
  enforce_reference: true,
  allow_reversals: false,
  single_expense_limit: 500,
  manager_approval_threshold: 5000,
  exchange_source: "OANDA",
};

export function FinancialConfigurationService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: config } = useSettings<FinanceConfig>("finance_config", defaultConfig);
  const updateConfig = useUpdateSettings<FinanceConfig>("finance_config");
  const [local, setLocal] = useState<FinanceConfig>(defaultConfig);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setLocal(config);
      setDirty(false);
    }
  }, [config]);

  const update = (patch: Partial<FinanceConfig>) => {
    setLocal(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(local);
      setDirty(false);
      toast.success("Financial configuration saved");
    } catch {
      toast.error("Failed to save configuration");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" /> Financial Configuration
          </h2>
          <p className="text-muted-foreground text-sm">Govern system-wide posting behaviors, approval chains, and exchange rate sources.</p>
        </div>
        {!isReadOnly && dirty && (
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" /> Global Posting Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Auto-Post Guest Folios</Label>
                <p className="text-xs text-muted-foreground">Post folio charges to GL immediately on checkout.</p>
              </div>
              <Switch checked={local.auto_post_folios} disabled={isReadOnly} onCheckedChange={v => update({ auto_post_folios: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Enforce Reference #</Label>
                <p className="text-xs text-muted-foreground">Require reference numbers for all manual journals.</p>
              </div>
              <Switch checked={local.enforce_reference} disabled={isReadOnly} onCheckedChange={v => update({ enforce_reference: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Allow Reversing Entries</Label>
                <p className="text-xs text-muted-foreground">Enable one-click reversal for posted entries.</p>
              </div>
              <Switch checked={local.allow_reversals} disabled={isReadOnly} onCheckedChange={v => update({ allow_reversals: v })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" /> Approval Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Single Expense Limit (No Approval)</Label>
              <Input
                type="number"
                value={local.single_expense_limit}
                onChange={e => update({ single_expense_limit: Number(e.target.value) })}
                disabled={isReadOnly}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Manager Approval Required Above</Label>
              <Input
                type="number"
                value={local.manager_approval_threshold}
                onChange={e => update({ manager_approval_threshold: Number(e.target.value) })}
                disabled={isReadOnly}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Exchange Rate Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-background flex items-center justify-center font-bold text-xs">{local.exchange_source}</div>
                <span className="text-xs font-medium">{local.exchange_source} FX Data</span>
              </div>
              <Badge variant="outline" className="text-success border-success/20">Connected</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" disabled={isReadOnly}>
              <RefreshCw className="h-3 w-3 mr-2" /> Force Sync Rates
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
