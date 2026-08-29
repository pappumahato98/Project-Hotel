import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Plus, ChevronRight } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { toast } from "sonner";

export function BudgetSetupService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: budgets, isLoading, createBudget } = useBudgets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: "", type: "annual", fiscal_year: currentYear.toString(),
    start_date: `${currentYear}-01-01`, end_date: `${currentYear}-12-31`, total_amount: "0",
  });

  const handleCreate = async () => {
    try {
      await createBudget.mutateAsync({
        name: form.name, type: form.type, fiscal_year: parseInt(form.fiscal_year),
        start_date: form.start_date, end_date: form.end_date,
        total_amount: parseFloat(form.total_amount) || 0,
        status: "draft", notes: null, created_by: null,
      });
      toast.success("Budget template created");
      setDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Budget Setup & Templates
          </h2>
          <p className="text-muted-foreground text-sm">Define fiscal frameworks, allocation rules, and approval hierarchies.</p>
        </div>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Create Template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Budget Template</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Fiscal Year</Label><Input value={form.fiscal_year} onChange={e => setForm(p => ({ ...p, fiscal_year: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} max={new Date().toISOString().slice(0, 10)} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.end_date} max={new Date().toISOString().slice(0, 10)} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
                </div>
                <div><Label>Total Amount</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
                <Button onClick={handleCreate} disabled={!form.name || createBudget.isPending} className="w-full">
                  {createBudget.isPending ? "Creating..." : "Create Budget"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Budgets</p>
            <h3 className="text-xl font-bold">{budgets?.length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Active</p>
            <h3 className="text-xl font-bold text-success">{budgets?.filter(b => b.status === "active").length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Allocated</p>
            <h3 className="text-xl font-bold">${(budgets || []).reduce((s, b) => s + b.total_amount, 0).toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budgeting Templates</CardTitle>
          <CardDescription>Master structures for various financial periods</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : (budgets || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No budgets created</TableCell></TableRow>
              ) : (budgets || []).map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-sm">{b.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] uppercase">{b.type}</Badge></TableCell>
                  <TableCell className="text-xs">{b.fiscal_year}</TableCell>
                  <TableCell className="text-right font-mono text-xs">${b.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      b.status === "active" ? "bg-success/10 text-success border-success/20 text-[10px]" :
                      b.status === "approved" ? "bg-primary/10 text-primary border-primary/20 text-[10px]" : "bg-muted text-[10px]"
                    }>{b.status}</Badge>
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
