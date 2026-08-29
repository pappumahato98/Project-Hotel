import { useState } from "react";
import { Star, Crown, Gift, TrendingUp, Plus, Edit, Trash2, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  loyaltySetup: any;
  setLoyaltySetup: (v: any) => void;
  onSave: () => void;
}

export function SetupLoyalty({ loyaltySetup, setLoyaltySetup, onSave }: Props) {
  const [tierModal, setTierModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false, data: { name: "", minNights: 0, pointsMultiplier: 1.0, color: "#3b82f6", benefits: [] }, isEdit: false
  });
  const [newBenefit, setNewBenefit] = useState("");

  const handleSaveTier = () => {
    if (!tierModal.data.name) { toast.error("Tier name is required"); return; }
    if (tierModal.isEdit) {
      setLoyaltySetup({ ...loyaltySetup, tiers: loyaltySetup.tiers.map((t: any) => t.id === tierModal.data.id ? tierModal.data : t) });
    } else {
      setLoyaltySetup({ ...loyaltySetup, tiers: [...loyaltySetup.tiers, { ...tierModal.data, id: "lt_" + Date.now() }] });
    }
    setTierModal({ ...tierModal, open: false });
    toast.success("Loyalty tier saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-gradient-blue">Loyalty & Membership Setup</h2>
        <p className="text-sm text-muted-foreground">Configure loyalty program tiers, points rules, benefits, and upgrade paths.</p>
      </div>

      {/* Program Toggle */}
      <Card variant="flat" className="border border-border/50 bg-secondary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-bold">Enable Loyalty Program</Label>
              <p className="text-xs text-muted-foreground">Activate the {loyaltySetup.programName} rewards system</p>
            </div>
            <Switch checked={loyaltySetup.enabled} onCheckedChange={(v) => setLoyaltySetup({ ...loyaltySetup, enabled: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Program Name</Label>
              <Input value={loyaltySetup.programName} onChange={(e) => setLoyaltySetup({ ...loyaltySetup, programName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Points Per Night</Label>
              <Input type="number" value={loyaltySetup.pointsPerNight} onChange={(e) => setLoyaltySetup({ ...loyaltySetup, pointsPerNight: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Points Expiry (days)</Label>
              <Input type="number" value={loyaltySetup.pointsExpiry} onChange={(e) => setLoyaltySetup({ ...loyaltySetup, pointsExpiry: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Redemption Rate (currency per point)</Label>
              <Input type="number" step="0.1" value={loyaltySetup.redemptionRate} onChange={(e) => setLoyaltySetup({ ...loyaltySetup, redemptionRate: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div>
                <span className="text-xs font-bold">Auto-Upgrade Tiers</span>
                <p className="text-[10px] text-muted-foreground">Automatically upgrade guests when they meet night thresholds</p>
              </div>
              <Switch checked={loyaltySetup.autoUpgrade} onCheckedChange={(v) => setLoyaltySetup({ ...loyaltySetup, autoUpgrade: v })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promo Bonus */}
      <Card variant="flat" className="border border-border/50 bg-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /> Promotional Bonus</Label>
              <p className="text-xs text-muted-foreground">{loyaltySetup.promoBonus?.label || "No active promo"}</p>
            </div>
            <Switch checked={loyaltySetup.promoBonus?.enabled} onCheckedChange={(v) => setLoyaltySetup({ ...loyaltySetup, promoBonus: { ...loyaltySetup.promoBonus, enabled: v } })} />
          </div>
          {loyaltySetup.promoBonus?.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Points Multiplier</Label>
                <Input type="number" step="0.5" value={loyaltySetup.promoBonus.multiplier} onChange={(e) => setLoyaltySetup({ ...loyaltySetup, promoBonus: { ...loyaltySetup.promoBonus, multiplier: Number(e.target.value) } })} />
              </div>
              <div className="space-y-2">
                <Label>Promo Label</Label>
                <Input value={loyaltySetup.promoBonus.label} onChange={(e) => setLoyaltySetup({ ...loyaltySetup, promoBonus: { ...loyaltySetup.promoBonus, label: e.target.value } })} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tiers Table */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold">Loyalty Tiers</h3>
        <Button size="sm" onClick={() => setTierModal({ open: true, data: { name: "", minNights: 0, pointsMultiplier: 1.0, color: "#3b82f6", benefits: [] }, isEdit: false })} className="gap-2">
          <Plus className="h-4 w-4" /> Add Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loyaltySetup.tiers?.map((tier: any) => (
          <Card key={tier.id} variant="flat" className="border border-border/50 overflow-hidden">
            <div className="h-2" style={{ backgroundColor: tier.color }} />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5" style={{ color: tier.color }} />
                  <span className="font-bold text-base">{tier.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTierModal({ open: true, data: { ...tier }, isEdit: true })}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Min. Nights: <span className="font-semibold text-foreground">{tier.minNights}</span></p>
                <p>Points Multiplier: <span className="font-semibold text-foreground">{tier.pointsMultiplier}x</span></p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Benefits</span>
                {tier.benefits?.map((b: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <Gift className="h-3 w-3 text-primary" />{b}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button onClick={onSave}><Save className="h-4 w-4 mr-2" /> Save Loyalty Settings</Button>
      </div>

      {/* Tier Dialog */}
      <Dialog open={tierModal.open} onOpenChange={(v) => setTierModal({ ...tierModal, open: v })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{tierModal.isEdit ? "Edit Tier" : "Add Loyalty Tier"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tier Name</Label><Input value={tierModal.data.name} onChange={(e) => setTierModal({ ...tierModal, data: { ...tierModal.data, name: e.target.value } })} /></div>
              <div className="space-y-2"><Label>Color</Label><Input type="color" value={tierModal.data.color} onChange={(e) => setTierModal({ ...tierModal, data: { ...tierModal.data, color: e.target.value } })} className="h-10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Min. Nights Required</Label><Input type="number" value={tierModal.data.minNights} onChange={(e) => setTierModal({ ...tierModal, data: { ...tierModal.data, minNights: Number(e.target.value) } })} /></div>
              <div className="space-y-2"><Label>Points Multiplier</Label><Input type="number" step="0.1" value={tierModal.data.pointsMultiplier} onChange={(e) => setTierModal({ ...tierModal, data: { ...tierModal.data, pointsMultiplier: Number(e.target.value) } })} /></div>
            </div>
            <div className="space-y-2 border p-3 rounded-lg bg-secondary/10">
              <Label className="text-xs font-bold block mb-1.5">Benefits</Label>
              <div className="space-y-1 max-h-[100px] overflow-y-auto mb-2">
                {tierModal.data.benefits?.map((b: string, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-background px-2 py-1 rounded text-xs border border-border/50">
                    <span>{b}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setTierModal({ ...tierModal, data: { ...tierModal.data, benefits: tierModal.data.benefits.filter((_: any, idx: number) => idx !== i) } })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="e.g. Free breakfast" value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" variant="outline" className="h-8" onClick={() => { if (newBenefit.trim()) { setTierModal({ ...tierModal, data: { ...tierModal.data, benefits: [...tierModal.data.benefits, newBenefit.trim()] } }); setNewBenefit(""); } }}>Add</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierModal({ ...tierModal, open: false })}>Cancel</Button>
            <Button onClick={handleSaveTier}>Save Tier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
