import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Plus, CheckCircle2 } from "lucide-react";
import { useTaxRates } from "@/hooks/useFinanceExtended";
import { toast } from "sonner";

export function TaxConfigurationService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: taxRates, isLoading, createTaxRate } = useTaxRates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", rate: "0", applies_to: "sales" });

  const handleCreate = async () => {
    try {
      await createTaxRate.mutateAsync({
        name: form.name, code: form.code, rate: parseFloat(form.rate) || 0,
        is_default: false, is_active: true, applies_to: [form.applies_to],
      });
      toast.success("Tax rate created");
      setDialogOpen(false);
      setForm({ name: "", code: "", rate: "0", applies_to: "sales" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Tax Configuration
          </h2>
          <p className="text-muted-foreground text-sm">Define tax slabs, regional rules, and electronic filing mappings.</p>
        </div>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Tax Code</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Tax Rate</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
                  <div><Label>Rate (%)</Label><Input type="number" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} /></div>
                </div>
                <div><Label>Applies To</Label><Input value={form.applies_to} onChange={e => setForm(p => ({ ...p, applies_to: e.target.value }))} placeholder="sales, purchases, services" /></div>
                <Button onClick={handleCreate} disabled={!form.name || !form.code || createTaxRate.isPending} className="w-full">
                  {createTaxRate.isPending ? "Creating..." : "Create Tax Rate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
            <div>
              <p className="text-xs font-medium text-success uppercase tracking-wider">Total Rates</p>
              <p className="text-xl font-bold">{taxRates?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary opacity-50" />
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Active Rates</p>
              <p className="text-xl font-bold">{taxRates?.filter(t => t.is_active).length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary opacity-50" />
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Default Rate</p>
              <p className="text-xl font-bold">{taxRates?.find(t => t.is_default)?.rate || 0}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Tax Master Registry</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : (taxRates || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tax rates configured</TableCell></TableRow>
              ) : (taxRates || []).map(tax => (
                <TableRow key={tax.id}>
                  <TableCell className="font-mono font-medium">{tax.code}</TableCell>
                  <TableCell>{tax.name}</TableCell>
                  <TableCell className="text-right font-bold">{tax.rate}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(tax.applies_to || []).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
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
