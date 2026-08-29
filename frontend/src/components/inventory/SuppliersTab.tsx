import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Loader2, Truck, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSuppliers, useInventoryItems, Supplier } from "@/hooks/inventory";
import { cn } from "@/lib/utils";

export function SuppliersTab() {
  const { data: suppliers = [], createSupplier, updateSupplier } = useSuppliers();
  const { data: items = [] } = useInventoryItems();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyForm = {
    name: "", supplier_code: "", contact_person: "", email: "",
    phone: "", address: "", payment_terms: "", notes: "",
    is_active: true, rating: 5, is_approved: true
  };
  const [form, setForm] = useState(emptyForm);

  const getItemCount = (supplierId: string) => items.filter((i) => i.supplier_id === supplierId).length;

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });

      if (editId) {
        await updateSupplier.mutateAsync({ id: editId, ...payload });
        toast.success("Supplier updated");
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success("Supplier created");
      }
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    } catch { toast.error("Failed to save supplier"); }
  };

  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({
      name: s.name, supplier_code: s.supplier_code || "",
      contact_person: s.contact_person || "", email: s.email || "",
      phone: s.phone || "", address: s.address || "",
      payment_terms: s.payment_terms || "", notes: s.notes || "",
      is_active: s.is_active, rating: s.rating || 5, is_approved: s.is_approved
    });
    setOpen(true);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Approved Supplier List</CardTitle><CardDescription>Manage vendors, performance ratings, and payment terms</CardDescription></div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button variant="blue" className="gap-2"><Plus className="h-4 w-4" />Add Supplier</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Register New"} Supplier</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>Supplier Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Supplier Code</Label><Input value={form.supplier_code} onChange={(e) => setForm({ ...form, supplier_code: e.target.value })} placeholder="SUP-001" /></div>
                <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="col-span-2 space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>

                <div className="space-y-2"><Label>Rating (1-5)</Label>
                  <div className="flex items-center gap-1 pt-1">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={cn("h-5 w-5 cursor-pointer", star <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted")} onClick={() => setForm({...form, rating: star})} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2 flex items-center gap-3 pt-6">
                  <Badge variant={form.is_approved ? "success" : "secondary"}>{form.is_approved ? "Approved" : "Pending Approval"}</Badge>
                  <Button variant="outline" size="xs" onClick={() => setForm({...form, is_approved: !form.is_approved})}>Toggle Status</Button>
                </div>

                <div className="col-span-2 space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g. Net 30" /></div>
                <div className="space-y-2"><Label>Tax Details (VAT/PAN)</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} variant="blue" disabled={!form.name || createSupplier.isPending || updateSupplier.isPending}>
                  {(createSupplier.isPending || updateSupplier.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editId ? "Save Changes" : "Register Supplier"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No suppliers registered</TableCell></TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{s.name}</div>
                      {s.is_approved && <CheckCircle2 className="h-3 w-3 text-success" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{s.supplier_code || "NO-CODE"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{s.contact_person || "-"}</div>
                    <div className="text-xs text-muted-foreground">{s.phone || ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-1" />
                      <span className="text-sm font-semibold">{s.rating || 5}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getItemCount(s.id)} SKUs</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.payment_terms || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "secondary" : "outline"} className={cn(s.is_active ? "text-success border-success/20" : "")}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
