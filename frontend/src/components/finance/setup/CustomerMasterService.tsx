import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Search, Plus, CreditCard, Building2, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { toast } from "sonner";

export function CustomerMasterService({ isReadOnly }: { isReadOnly?: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: customers, isLoading, createCustomer } = useCustomers();

  const [form, setForm] = useState({ name: "", type: "individual", email: "", phone: "", credit_limit: "0", payment_terms: "Net 30" });

  const filtered = (customers || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceivables = filtered.reduce((s, c) => s + c.credit_limit, 0);
  const activeCount = filtered.filter(c => c.is_active).length;

  const handleCreate = async () => {
    try {
      await createCustomer.mutateAsync({
        name: form.name,
        type: form.type,
        email: form.email || null,
        phone: form.phone || null,
        credit_limit: parseFloat(form.credit_limit) || 0,
        payment_terms: form.payment_terms,
        is_active: true,
        address: null, city: null, country: null, tax_id: null, contact_person: null, notes: null,
      });
      toast.success("Customer created");
      setDialogOpen(false);
      setForm({ name: "", type: "individual", email: "", phone: "", credit_limit: "0", payment_terms: "Net 30" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Customer & Corporate Master
          </h2>
          <p className="text-muted-foreground text-sm">Manage credit limits, billing templates, and client profiles.</p>
        </div>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Credit Limit</Label><Input type="number" value={form.credit_limit} onChange={e => setForm(p => ({ ...p, credit_limit: e.target.value }))} /></div>
                  <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></div>
                </div>
                <Button onClick={handleCreate} disabled={!form.name || createCustomer.isPending} className="w-full">
                  {createCustomer.isPending ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Customers</p>
            <h3 className="text-xl font-bold">{customers?.length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Active</p>
            <h3 className="text-xl font-bold">{activeCount}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Credit Lines</p>
            <h3 className="text-xl font-bold">${totalReceivables.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Master Directory</CardTitle>
          <CardDescription>Centralized repository of all billable entities</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-semibold text-sm">{c.name}</div>
                    {c.email && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {c.email}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {c.type === "corporate" ? <Building2 className="h-2.5 w-2.5 mr-1" /> : <Users className="h-2.5 w-2.5 mr-1" />}
                      {c.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.payment_terms || "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">${c.credit_limit.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", c.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted")}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
