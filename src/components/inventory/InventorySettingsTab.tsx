import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings2, Database, Calculator, Wallet, ShieldCheck, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useInventorySettings, useInventoryAutomation } from "@/hooks/inventory";

export function InventorySettingsTab() {
  const { data: dbSettings, updateSettings, isLoading } = useInventorySettings();
  const { generateLowStockPOs } = useInventoryAutomation();
  const [localSettings, setLocalSettings] = useState({
    costing_method: "weighted_average",
    inventory_gl_account: "",
    consumption_gl_account: "",
    wastage_gl_account: "",
    adjustment_gl_account: "",
    purchase_gl_account: "",
    auto_replenish: "false",
    auto_po_generation: "false",
    require_approval: "true",
    batch_tracking: "false"
  });

  useEffect(() => {
    if (dbSettings) {
      setLocalSettings(prev => ({
        ...prev,
        ...dbSettings
      }));
    }
  }, [dbSettings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      toast.success("Inventory settings updated");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-medium">Inventory Global Settings</h3>
        <p className="text-sm text-muted-foreground">Configure costing methods, accounting integration, and automation rules</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Costing & Valuation */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2 font-semibold">
              <Calculator className="h-4 w-4 text-primary" /> Costing Method
            </div>
            <div className="space-y-2">
              <Label>Valuation Standard</Label>
              <Select value={localSettings.costing_method} onValueChange={(v) => setLocalSettings({...localSettings, costing_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">FIFO (First In First Out)</SelectItem>
                  <SelectItem value="lifo">LIFO (Last In First Out)</SelectItem>
                  <SelectItem value="weighted_average">Weighted Average</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Determines how COGS is calculated for reports and POS deduction.</p>
            </div>
          </CardContent>
        </Card>

        {/* Finance Integration */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2 font-semibold">
              <Wallet className="h-4 w-4 text-primary" /> GL Account Mapping (UUIDs)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Asset</Label>
                <Input size={30} className="h-8 text-[10px] font-mono" value={localSettings.inventory_gl_account} onChange={(e) => setLocalSettings({...localSettings, inventory_gl_account: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Consumption</Label>
                <Input size={30} className="h-8 text-[10px] font-mono" value={localSettings.consumption_gl_account} onChange={(e) => setLocalSettings({...localSettings, consumption_gl_account: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Wastage</Label>
                <Input size={30} className="h-8 text-[10px] font-mono" value={localSettings.wastage_gl_account} onChange={(e) => setLocalSettings({...localSettings, wastage_gl_account: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Adjustment</Label>
                <Input size={30} className="h-8 text-[10px] font-mono" value={localSettings.adjustment_gl_account} onChange={(e) => setLocalSettings({...localSettings, adjustment_gl_account: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">Purchase</Label>
                <Input size={30} className="h-8 text-[10px] font-mono" value={localSettings.purchase_gl_account} onChange={(e) => setLocalSettings({...localSettings, purchase_gl_account: e.target.value})} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automation Controls */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6 font-semibold">
              <Settings2 className="h-4 w-4 text-primary" /> Workflow Controls
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Requisitions</Label>
                  <p className="text-xs text-muted-foreground">Generate requests on low stock</p>
                </div>
                <Switch checked={localSettings.auto_replenish === "true"} onCheckedChange={(v) => setLocalSettings({...localSettings, auto_replenish: String(v)})} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Approval Required</Label>
                  <p className="text-xs text-muted-foreground">Approval for all stock issues</p>
                </div>
                <Switch checked={localSettings.require_approval === "true"} onCheckedChange={(v) => setLocalSettings({...localSettings, require_approval: String(v)})} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Batch Tracking</Label>
                  <p className="text-xs text-muted-foreground">Enforce batch & expiry logging</p>
                </div>
                <Switch checked={localSettings.batch_tracking === "true"} onCheckedChange={(v) => setLocalSettings({...localSettings, batch_tracking: String(v)})} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-PO Generation</Label>
                  <p className="text-xs text-muted-foreground">Create draft POs for low stock</p>
                </div>
                <Switch checked={localSettings.auto_po_generation === "true"} onCheckedChange={(v) => setLocalSettings({...localSettings, auto_po_generation: String(v)})} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500 text-amber-600"
          onClick={() => generateLowStockPOs.mutate()}
          disabled={generateLowStockPOs.isPending}
        >
           {generateLowStockPOs.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
           Trigger Auto-PO Generation
        </Button>
        <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading} variant="blue" className="w-full md:w-auto">
          {updateSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
