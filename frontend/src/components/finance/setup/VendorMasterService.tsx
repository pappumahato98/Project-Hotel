import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Truck, Search, Plus, Clock, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

function useSuppliers() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await db.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data as any[];
    },
  });
  const create = useMutation({
    mutationFn: async (s: any) => {
      const { data, error } = await db.from("suppliers").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
  return { ...query, create };
}

export function VendorMasterService({ isReadOnly }: { isReadOnly?: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: vendors, isLoading, create } = useSuppliers();
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", payment_terms: "Net 30", address: "" });

  const filtered = (vendors || []).filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await create.mutateAsync({ ...form, is_active: true, notes: null });
      toast.success("Vendor created");
      setDialogOpen(false);
      setForm({ name: "", contact_person: "", email: "", phone: "", payment_terms: "Net 30", address: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Vendor Master
          </h2>
          <p className="text-muted-foreground text-sm">Register and manage vendor relationships and payment terms.</p>
        </div>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Vendor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></div>
                <Button onClick={handleCreate} disabled={!form.name || create.isPending} className="w-full">
                  {create.isPending ? "Creating..." : "Create Vendor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Vendors</p>
            <h3 className="text-xl font-bold">{vendors?.filter(v => v.is_active).length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Vendors</p>
            <h3 className="text-xl font-bold">{vendors?.length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
            <h3 className="text-xl font-bold text-success">Active</h3>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Vendor Directory</CardTitle>
          <CardDescription>Suppliers registered in the system</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vendors found</TableCell></TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-semibold text-sm">{v.name}</div>
                    {v.contact_person && <div className="text-[10px] text-muted-foreground">{v.contact_person}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{v.phone || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {v.payment_terms || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={v.is_active ? "bg-success/10 text-success border-success/20 text-[10px]" : "bg-muted text-[10px]"}>
                      {v.is_active ? "Active" : "Inactive"}
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
