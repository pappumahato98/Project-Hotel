import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, Plus, Settings2 } from "lucide-react";
import { useFixedAssets } from "@/hooks/useFixedAssets";
import { toast } from "sonner";

export function AssetMasterService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: assets, isLoading, createAsset } = useFixedAssets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "Furniture & Fixtures", cost: "0", salvage_value: "0",
    useful_life_months: "60", depreciation_method: "straight_line", location: "",
  });

  const handleCreate = async () => {
    try {
      const num = `ASST-${String((assets?.length || 0) + 1).padStart(4, "0")}`;
      await createAsset.mutateAsync({
        asset_number: num, name: form.name, category: form.category,
        cost: parseFloat(form.cost) || 0, salvage_value: parseFloat(form.salvage_value) || 0,
        useful_life_months: parseInt(form.useful_life_months) || 60,
        depreciation_method: form.depreciation_method,
        location: form.location || null, description: null, acquisition_date: new Date().toISOString().split("T")[0],
        accumulated_depreciation: 0, status: "active", disposed_date: null, disposal_amount: null,
        account_id: null, notes: null,
      });
      toast.success("Asset registered");
      setDialogOpen(false);
      setForm({ name: "", category: "Furniture & Fixtures", cost: "0", salvage_value: "0", useful_life_months: "60", depreciation_method: "straight_line", location: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  // Group by category
  const categories = (assets || []).reduce<Record<string, { count: number; method: string; life: number }>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = { count: 0, method: a.depreciation_method, life: a.useful_life_months };
    acc[a.category].count++;
    return acc;
  }, {});

  const totalCost = (assets || []).reduce((s, a) => s + a.cost, 0);
  const totalAccumDep = (assets || []).reduce((s, a) => s + a.accumulated_depreciation, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" /> Fixed Asset Master
          </h2>
          <p className="text-muted-foreground text-sm">Register assets, define depreciation, and track valuations.</p>
        </div>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Register Asset</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Land & Buildings">Land & Buildings</SelectItem>
                      <SelectItem value="Furniture & Fixtures">Furniture & Fixtures</SelectItem>
                      <SelectItem value="IT Equipment">IT Equipment</SelectItem>
                      <SelectItem value="Vehicles">Vehicles</SelectItem>
                      <SelectItem value="Kitchen Equipment">Kitchen Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cost</Label><Input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} /></div>
                  <div><Label>Salvage Value</Label><Input type="number" value={form.salvage_value} onChange={e => setForm(p => ({ ...p, salvage_value: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Useful Life (months)</Label><Input type="number" value={form.useful_life_months} onChange={e => setForm(p => ({ ...p, useful_life_months: e.target.value }))} /></div>
                  <div><Label>Method</Label>
                    <Select value={form.depreciation_method} onValueChange={v => setForm(p => ({ ...p, depreciation_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight Line</SelectItem>
                        <SelectItem value="declining_balance">Declining Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                <Button onClick={handleCreate} disabled={!form.name || createAsset.isPending} className="w-full">
                  {createAsset.isPending ? "Creating..." : "Register Asset"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Assets</p>
            <h3 className="text-xl font-bold">{assets?.length || 0}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Cost</p>
            <h3 className="text-xl font-bold">${totalCost.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Net Book Value</p>
            <h3 className="text-xl font-bold text-success">${(totalCost - totalAccumDep).toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-center">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(categories).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No assets registered</TableCell></TableRow>
              ) : Object.entries(categories).map(([cat, info]) => (
                <TableRow key={cat}>
                  <TableCell className="font-medium text-sm">{cat}</TableCell>
                  <TableCell className="text-xs capitalize">{info.method.replace("_", " ")}</TableCell>
                  <TableCell className="text-center text-xs">{info.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Asset Register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : (assets || []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assets</TableCell></TableRow>
              ) : (assets || []).map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs font-bold text-primary">{a.asset_number}</TableCell>
                  <TableCell className="text-sm font-medium">{a.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{a.category}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs">${a.cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">${(a.cost - a.accumulated_depreciation).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={a.status === "active" ? "bg-success/10 text-success border-success/20 text-[10px]" : "bg-muted text-[10px]"}>
                      {a.status}
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
