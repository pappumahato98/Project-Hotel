import { useState } from "react";
import { Building2, Plus, Edit, Trash2, Save, Globe, ArrowLeftRight, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  multiProperty: any;
  setMultiProperty: (v: any) => void;
  onSave: () => void;
}

export function SetupMultiProperty({ multiProperty, setMultiProperty, onSave }: Props) {
  const [propertyModal, setPropertyModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false, data: { name: "", code: "", city: "", active: true, isPrimary: false }, isEdit: false
  });

  const handleSaveProperty = () => {
    const d = propertyModal.data;
    if (!d.name || !d.code) { toast.error("Name and code required"); return; }
    if (propertyModal.isEdit) {
      setMultiProperty({ ...multiProperty, properties: multiProperty.properties.map((p: any) => p.id === d.id ? d : p) });
    } else {
      setMultiProperty({ ...multiProperty, properties: [...multiProperty.properties, { ...d, id: "mp_" + Date.now() }] });
    }
    setPropertyModal({ ...propertyModal, open: false });
    toast.success("Property saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-gradient-blue">Multi-Property / Centralized Setup</h2>
        <p className="text-sm text-muted-foreground">Manage centralized brand settings, property-specific overrides, and inter-property transfers.</p>
      </div>

      {/* Enable Toggle */}
      <Card variant="flat" className="border border-border/50 bg-secondary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-bold">Enable Multi-Property Mode</Label>
              <p className="text-xs text-muted-foreground">Manage multiple properties under a single brand umbrella</p>
            </div>
            <Switch checked={multiProperty.enabled} onCheckedChange={(v) => setMultiProperty({ ...multiProperty, enabled: v })} />
          </div>
          {multiProperty.enabled && (
            <div className="space-y-2">
              <Label>Brand / Group Name</Label>
              <Input value={multiProperty.brandName} onChange={(e) => setMultiProperty({ ...multiProperty, brandName: e.target.value })} />
            </div>
          )}
        </CardContent>
      </Card>

      {multiProperty.enabled && (
        <>
          {/* Properties List */}
          <Card variant="flat" className="border border-border/50 bg-secondary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-bold">Registered Properties</Label>
                </div>
                <Button size="sm" onClick={() => setPropertyModal({ open: true, data: { name: "", code: "", city: "", active: true, isPrimary: false }, isEdit: false })} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Property Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multiProperty.properties?.map((p: any) => (
                      <TableRow key={p.id} className="hover:bg-secondary/20">
                        <TableCell className="font-semibold">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.code}</TableCell>
                        <TableCell>{p.city}</TableCell>
                        <TableCell><Badge variant={p.active ? "success" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell>{p.isPrimary ? <Badge variant="outline" className="bg-primary/10 text-primary">Primary</Badge> : <span className="text-xs text-muted-foreground">Branch</span>}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPropertyModal({ open: true, data: { ...p }, isEdit: true })}><Edit className="h-4 w-4" /></Button>
                          {!p.isPrimary && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setMultiProperty({ ...multiProperty, properties: multiProperty.properties.filter((x: any) => x.id !== p.id) })}><Trash2 className="h-4 w-4" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Shared Settings */}
          <Card variant="flat" className="border border-border/50 bg-secondary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <Label className="text-sm font-bold">Centralized Shared Settings</Label>
              </div>
              <p className="text-xs text-muted-foreground">Select which configurations are shared across all properties vs. managed locally.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: "loyaltyProgram", label: "Loyalty Program", desc: "Share tiers & points across properties" },
                  { key: "taxTemplates", label: "Tax Templates", desc: "Unified tax brackets for all locations" },
                  { key: "documentTemplates", label: "Document Templates", desc: "Shared invoice/receipt formats" },
                  { key: "ratePlans", label: "Rate Plans", desc: "Centralized rate strategy management" }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div>
                      <span className="text-xs font-bold">{item.label}</span>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={multiProperty.sharedSettings?.[item.key]}
                      onCheckedChange={(v) => setMultiProperty({
                        ...multiProperty,
                        sharedSettings: { ...multiProperty.sharedSettings, [item.key]: v }
                      })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inter-Property Transfer */}
          <Card variant="flat" className="border border-border/50 bg-secondary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <Label className="text-sm font-bold">Inter-Property Transfer Rules</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <span className="text-xs font-bold">Allow Transfers</span>
                    <p className="text-[10px] text-muted-foreground">Guest can transfer between properties</p>
                  </div>
                  <Switch
                    checked={multiProperty.interPropertyTransfer?.enabled}
                    onCheckedChange={(v) => setMultiProperty({
                      ...multiProperty,
                      interPropertyTransfer: { ...multiProperty.interPropertyTransfer, enabled: v }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <span className="text-xs font-bold">Same Brand Only</span>
                    <p className="text-[10px] text-muted-foreground">Restrict to same brand properties</p>
                  </div>
                  <Switch
                    checked={multiProperty.interPropertyTransfer?.sameBrandOnly}
                    onCheckedChange={(v) => setMultiProperty({
                      ...multiProperty,
                      interPropertyTransfer: { ...multiProperty.interPropertyTransfer, sameBrandOnly: v }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <span className="text-xs font-bold">Require Approval</span>
                    <p className="text-[10px] text-muted-foreground">Manager must approve transfers</p>
                  </div>
                  <Switch
                    checked={multiProperty.interPropertyTransfer?.requireApproval}
                    onCheckedChange={(v) => setMultiProperty({
                      ...multiProperty,
                      interPropertyTransfer: { ...multiProperty.interPropertyTransfer, requireApproval: v }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="pt-4 border-t border-border flex justify-end">
        <Button onClick={onSave}><Save className="h-4 w-4 mr-2" /> Save Multi-Property Config</Button>
      </div>

      {/* Property Dialog */}
      <Dialog open={propertyModal.open} onOpenChange={(v) => setPropertyModal({ ...propertyModal, open: v })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{propertyModal.isEdit ? "Edit Property" : "Register Property"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Property Name</Label><Input value={propertyModal.data.name} onChange={(e) => setPropertyModal({ ...propertyModal, data: { ...propertyModal.data, name: e.target.value } })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Property Code</Label><Input value={propertyModal.data.code} onChange={(e) => setPropertyModal({ ...propertyModal, data: { ...propertyModal.data, code: e.target.value.toUpperCase() } })} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={propertyModal.data.city} onChange={(e) => setPropertyModal({ ...propertyModal, data: { ...propertyModal.data, city: e.target.value } })} /></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border">
              <Label className="text-xs">Active</Label>
              <Switch checked={propertyModal.data.active} onCheckedChange={(v) => setPropertyModal({ ...propertyModal, data: { ...propertyModal.data, active: v } })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPropertyModal({ ...propertyModal, open: false })}>Cancel</Button>
            <Button onClick={handleSaveProperty}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
