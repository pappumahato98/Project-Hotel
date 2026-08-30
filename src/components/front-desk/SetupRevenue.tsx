import { useState } from "react";
import { TrendingUp, Plus, Edit, Trash2, Save, BarChart3, Target, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  revenueConfig: any;
  setRevenueConfig: (v: any) => void;
  onSave: () => void;
}

export function SetupRevenue({ revenueConfig, setRevenueConfig, onSave }: Props) {
  const [thresholdModal, setThresholdModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false, data: { minOccupancy: 80, rateIncrease: 10, label: "" }, isEdit: false
  });
  const [paceModal, setPaceModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false, data: { daysBeforeArrival: 14, minPickupPercent: 30, action: "" }, isEdit: false
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-gradient-blue">Revenue Management Parameters</h2>
        <p className="text-sm text-muted-foreground">Configure occupancy-based pricing hints, booking-pace rules, and comp/ADR targets.</p>
      </div>

      {/* Occupancy-Based Pricing */}
      <Card variant="flat" className="border border-border/50 bg-secondary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Occupancy-Based Dynamic Pricing</Label>
            </div>
            <Switch checked={revenueConfig.occupancyPricingEnabled} onCheckedChange={(v) => setRevenueConfig({ ...revenueConfig, occupancyPricingEnabled: v })} />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setThresholdModal({ open: true, data: { minOccupancy: 80, rateIncrease: 10, label: "" }, isEdit: false })} className="gap-2">
              <Plus className="h-4 w-4" /> Add Threshold
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Min Occupancy %</TableHead>
                  <TableHead>Rate Increase %</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueConfig.occupancyThresholds?.map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-secondary/20">
                    <TableCell className="font-mono font-bold">{t.minOccupancy}%</TableCell>
                    <TableCell><Badge variant="outline" className="bg-success/10 text-success border-success/30">+{t.rateIncrease}%</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.label}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setThresholdModal({ open: true, data: { ...t }, isEdit: true })}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setRevenueConfig({ ...revenueConfig, occupancyThresholds: revenueConfig.occupancyThresholds.filter((x: any) => x.id !== t.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Booking Pace Rules */}
      <Card variant="flat" className="border border-border/50 bg-secondary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <Label className="text-sm font-bold">Booking Pace Rules</Label>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPaceModal({ open: true, data: { daysBeforeArrival: 14, minPickupPercent: 30, action: "" }, isEdit: false })} className="gap-2">
              <Plus className="h-4 w-4" /> Add Pace Rule
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Days Before Arrival</TableHead>
                  <TableHead>Min Pickup %</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueConfig.bookingPaceRules?.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-secondary/20">
                    <TableCell className="font-mono font-bold">{r.daysBeforeArrival} days</TableCell>
                    <TableCell>{r.minPickupPercent}%</TableCell>
                    <TableCell className="text-sm">{r.action}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPaceModal({ open: true, data: { ...r }, isEdit: true })}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setRevenueConfig({ ...revenueConfig, bookingPaceRules: revenueConfig.bookingPaceRules.filter((x: any) => x.id !== r.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Comp & ADR Targets */}
      <Card variant="flat" className="border border-border/50 bg-secondary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <Label className="text-sm font-bold">Complimentary & ADR Targets</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4 p-3 bg-background rounded-lg border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Comp Rules Active</Label>
                <Switch checked={revenueConfig.compRules?.enabled} onCheckedChange={(v) => setRevenueConfig({ ...revenueConfig, compRules: { ...revenueConfig.compRules, enabled: v } })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">No Comps Below ADR</Label>
                <Input type="number" value={revenueConfig.compRules?.noCompsBelowADR} onChange={(e) => setRevenueConfig({ ...revenueConfig, compRules: { ...revenueConfig.compRules, noCompsBelowADR: Number(e.target.value) } })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max Comp % Per Month</Label>
                <Input type="number" step="0.5" value={revenueConfig.compRules?.maxCompPercentPerMonth} onChange={(e) => setRevenueConfig({ ...revenueConfig, compRules: { ...revenueConfig.compRules, maxCompPercentPerMonth: Number(e.target.value) } })} />
              </div>
            </div>
            <div className="space-y-4 p-3 bg-background rounded-lg border">
              <Label className="text-xs font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" /> ADR Targets</Label>
              <div className="space-y-2">
                <Label className="text-xs">Monthly ADR Target</Label>
                <Input type="number" value={revenueConfig.adrTargets?.monthly} onChange={(e) => setRevenueConfig({ ...revenueConfig, adrTargets: { ...revenueConfig.adrTargets, monthly: Number(e.target.value) } })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quarterly ADR Target</Label>
                <Input type="number" value={revenueConfig.adrTargets?.quarterly} onChange={(e) => setRevenueConfig({ ...revenueConfig, adrTargets: { ...revenueConfig.adrTargets, quarterly: Number(e.target.value) } })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Alert Below % of Target</Label>
                <Input type="number" value={revenueConfig.adrTargets?.alertBelowPercent} onChange={(e) => setRevenueConfig({ ...revenueConfig, adrTargets: { ...revenueConfig.adrTargets, alertBelowPercent: Number(e.target.value) } })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button onClick={onSave}><Save className="h-4 w-4 mr-2" /> Save Revenue Parameters</Button>
      </div>

      {/* Threshold Dialog */}
      <Dialog open={thresholdModal.open} onOpenChange={(v) => setThresholdModal({ ...thresholdModal, open: v })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Occupancy Pricing Threshold</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Min Occupancy %</Label><Input type="number" value={thresholdModal.data.minOccupancy} onChange={(e) => setThresholdModal({ ...thresholdModal, data: { ...thresholdModal.data, minOccupancy: Number(e.target.value) } })} /></div>
              <div className="space-y-2"><Label>Rate Increase %</Label><Input type="number" value={thresholdModal.data.rateIncrease} onChange={(e) => setThresholdModal({ ...thresholdModal, data: { ...thresholdModal.data, rateIncrease: Number(e.target.value) } })} /></div>
            </div>
            <div className="space-y-2"><Label>Description Label</Label><Input value={thresholdModal.data.label} onChange={(e) => setThresholdModal({ ...thresholdModal, data: { ...thresholdModal.data, label: e.target.value } })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdModal({ ...thresholdModal, open: false })}>Cancel</Button>
            <Button onClick={() => {
              const d = thresholdModal.data;
              if (thresholdModal.isEdit) {
                setRevenueConfig({ ...revenueConfig, occupancyThresholds: revenueConfig.occupancyThresholds.map((t: any) => t.id === d.id ? d : t) });
              } else {
                setRevenueConfig({ ...revenueConfig, occupancyThresholds: [...revenueConfig.occupancyThresholds, { ...d, id: "ot_" + Date.now() }] });
              }
              setThresholdModal({ ...thresholdModal, open: false });
              toast.success("Threshold saved");
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pace Rule Dialog */}
      <Dialog open={paceModal.open} onOpenChange={(v) => setPaceModal({ ...paceModal, open: v })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Booking Pace Rule</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Days Before Arrival</Label><Input type="number" value={paceModal.data.daysBeforeArrival} onChange={(e) => setPaceModal({ ...paceModal, data: { ...paceModal.data, daysBeforeArrival: Number(e.target.value) } })} /></div>
              <div className="space-y-2"><Label>Min Pickup %</Label><Input type="number" value={paceModal.data.minPickupPercent} onChange={(e) => setPaceModal({ ...paceModal, data: { ...paceModal.data, minPickupPercent: Number(e.target.value) } })} /></div>
            </div>
            <div className="space-y-2"><Label>Triggered Action</Label><Input value={paceModal.data.action} placeholder="e.g. Release 5 rooms for walk-in" onChange={(e) => setPaceModal({ ...paceModal, data: { ...paceModal.data, action: e.target.value } })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaceModal({ ...paceModal, open: false })}>Cancel</Button>
            <Button onClick={() => {
              const d = paceModal.data;
              if (paceModal.isEdit) {
                setRevenueConfig({ ...revenueConfig, bookingPaceRules: revenueConfig.bookingPaceRules.map((r: any) => r.id === d.id ? d : r) });
              } else {
                setRevenueConfig({ ...revenueConfig, bookingPaceRules: [...revenueConfig.bookingPaceRules, { ...d, id: "bp_" + Date.now() }] });
              }
              setPaceModal({ ...paceModal, open: false });
              toast.success("Pace rule saved");
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
