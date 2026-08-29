import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Package, AlertTriangle, TrendingDown, ArrowUpDown, Loader2, Edit, Trash2, DollarSign, Image as ImageIcon, MapPin, Warehouse, CheckCircle, XCircle, RefreshCw, Barcode, ScanLine, Percent, Timer, Activity, Settings, Download } from "lucide-react";
import { toast } from "sonner";
import { useInventoryItems, useInventoryCategories, useSuppliers, useInventoryStats, useInventoryUoMs, useInventoryStores, InventoryItem } from "@/hooks/inventory";
import { formatCurrency, cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ItemsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [adjustStockOpen, setAdjustStockOpen] = useState(false);
  const [pendingAdjOpen, setPendingAdjOpen] = useState(false);
  const [storeStockOpen, setStoreStockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);

  const { data: items = [], isLoading, createItem, updateItem, adjustStock } = useInventoryItems({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    lowStock: showLowStock,
  });
  const { data: categories = [] } = useInventoryCategories();
  const { data: suppliers = [] } = useSuppliers();
  const { data: uoms = [] } = useInventoryUoMs();
  const { data: stores = [] } = useInventoryStores();
  const stats = useInventoryStats();

  const { data: pendingAdjustments = [], refetch: refetchAdj } = useQuery({
     queryKey: ["pending-inventory-adjustments"],
     queryFn: async () => {
        const { data } = await supabase.from('stock_movements').select('*, item:inventory_items(name)').eq('reference_type', 'manual_adjustment').filter('notes', 'ilike', 'PENDING_APPROVAL%');
        return (data || []) as unknown as { id: string, item_id: string, quantity: number, movement_type: string, notes: string | null, item?: { name: string } }[];
     }
  });

  const emptyForm = {
    name: "", sku: "", category_id: "", supplier_id: "", uom_id: "",
    cost_price: 0, selling_price: 0, item_type: "consumable",
    min_stock: 0, max_stock: 0, reorder_point: 0, safety_stock: 0,
    shelf_life: "", storage_instructions: "", temperature_classification: "Ambient",
    image_url: "",
    tax_applicability: [] as string[],
    attributes: {} as Record<string, string>
  };
  const [form, setForm] = useState(emptyForm);
  const [stockAdj, setStockAdj] = useState<{ quantity: number, type: "in" | "out" | "adjustment", notes: string, storeId: string, reason: string }>({
     quantity: 0,
     type: "adjustment",
     notes: "",
     storeId: "",
     reason: "Physical Count"
  });

  const filteredItems = items.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBarcode = !barcodeSearch || item.sku === barcodeSearch;
    return matchesQuery && matchesBarcode;
  });

  const generateSKU = () => {
     if (!form.category_id) {
        toast.error("Please select a category first");
        return;
     }
     const cat = categories.find(c => c.id === form.category_id);
     const prefix = cat?.sku_prefix || cat?.name?.substring(0, 3).toUpperCase() || "ITEM";
     const random = Math.floor(1000 + Math.random() * 9000);
     setForm({ ...form, sku: `${prefix}-${random}` });
     toast.success("SKU Generated");
  };

  const handleAdjustRequest = async () => {
    if (!selectedItem) return;
    try {
      await supabase.from('stock_movements').insert({
         item_id: selectedItem.id,
         movement_type: stockAdj.type,
         quantity: stockAdj.quantity,
         store_id: stockAdj.storeId,
         reference_type: 'manual_adjustment',
         notes: `PENDING_APPROVAL|${stockAdj.reason}|${stockAdj.notes}`
      });
      toast.success("Adjustment request submitted");
      setAdjustStockOpen(false);
      refetchAdj();
    } catch (error: any) {
      console.error("Adjustment request error:", error);
      toast.error(error.message || "Failed to submit adjustment");
    }
  };

  const approveAdjustment = async (adj: { id: string; item_id: string; quantity: number; movement_type: string; notes: string | null }) => {
     try {
        const [, reason, notes] = adj.notes?.split('|') || [];
        const type = adj.movement_type === 'out' ? 'out' : 'in';
        await adjustStock.mutateAsync({
           itemId: adj.item_id,
           quantity: adj.quantity,
           type: type as "in" | "out" | "adjustment",
           reason: reason || 'Adjustment',
           notes: notes || ''
        });
        await supabase.from('stock_movements').delete().eq('id', adj.id);
        toast.success("Adjustment approved");
        refetchAdj();
     } catch (error: any) {
        console.error("Adjustment approval error:", error);
        toast.error(error.message || "Approval failed");
     }
  };

  const toggleTax = (taxCode: string) => {
     const current = [...form.tax_applicability];
     const idx = current.indexOf(taxCode);
     if (idx > -1) current.splice(idx, 1);
     else current.push(taxCode);
     setForm({ ...form, tax_applicability: current });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `inventory/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Reusing avatars bucket or would create 'inventory'
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setForm({ ...form, image_url: publicUrl });
      toast.success("Image uploaded");
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast.error(error.message || "Upload failed");
    }
    finally { setIsUploading(false); }
  };

  const handleCreate = async () => {
    if (form.min_stock > (form.max_stock || 0) && (form.max_stock || 0) > 0) {
       toast.error("Min stock cannot be greater than max stock");
       return;
    }
    if (form.reorder_point < form.min_stock) {
       toast.error("Reorder point should be at least equal to min stock");
       return;
    }

    try {
      const payload: Partial<InventoryItem> = { ...form };
      if (!payload.category_id) delete payload.category_id;
      if (!payload.supplier_id) delete payload.supplier_id;
      if (!payload.uom_id) delete payload.uom_id;
      await createItem.mutateAsync(payload);
      toast.success("Item registered");
      setAddItemOpen(false);
      setForm(emptyForm);
    } catch (error: any) {
      console.error("Create item error:", error);
      toast.error(error.message || "Failed to register item");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="lg:col-span-1"><CardContent className="pt-4 px-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Total SKUs</p><p className="text-xl font-bold mt-1">{stats.totalItems}</p></div><Package className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card className="lg:col-span-1 cursor-pointer hover:border-amber-500/50" onClick={() => setShowLowStock(!showLowStock)}><CardContent className="pt-4 px-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Low Stock</p><p className="text-xl font-bold text-amber-500 mt-1">{stats.lowStock}</p></div><AlertTriangle className="h-5 w-5 text-amber-500" /></div></CardContent></Card>
        <Card className="lg:col-span-1 cursor-pointer border-blue-500/50 bg-blue-50/50" onClick={() => setPendingAdjOpen(true)}><CardContent className="pt-4 px-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter leading-none">Pending Adj.</p><p className="text-xl font-bold text-blue-700 mt-1">{pendingAdjustments.length}</p></div><ArrowUpDown className="h-5 w-5 text-blue-500" /></div></CardContent></Card>
        <Card className="lg:col-span-1"><CardContent className="pt-4 px-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Avg Aging</p><p className="text-xl font-bold mt-1">{stats.avgAgingDays}d</p></div><Timer className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card className="lg:col-span-1"><CardContent className="pt-4 px-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Last Variance</p><p className="text-xl font-bold text-destructive mt-1">{stats.stockVariance}</p></div><Activity className="h-5 w-5 text-destructive" /></div></CardContent></Card>
        <Card className="lg:col-span-1"><CardContent className="pt-4 px-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">Asset Value</p><p className="text-xl font-bold text-primary mt-1 truncate">{formatCurrency(stats.totalValue)}</p></div><DollarSign className="h-5 w-5 text-primary" /></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-muted/30 p-4 rounded-xl border border-dashed border-primary/20">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name/SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48 h-9 text-xs" />
          </div>
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input placeholder="Barcode Scan..." value={barcodeSearch} onChange={(e) => setBarcodeSearch(e.target.value)} className="pl-9 w-48 h-9 border-primary/50 text-xs" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="blue" className="gap-2 h-9 shadow-3d-blue" onClick={() => setAddItemOpen(true)}><Plus className="h-4 w-4" />Register Item</Button>
      </div>

      <Card variant="elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Master</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Taxes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredItems.map((item) => {
                const status = (item.current_stock === 0) ? { label: "Out", color: "bg-destructive/10 text-destructive" } : (item.current_stock <= item.reorder_point) ? { label: "Low", color: "bg-amber-500/10 text-amber-500" } : { label: "In Stock", color: "bg-success/10 text-success" };
                return (
                  <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center border">
                          {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover rounded" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div><p className="font-bold text-xs">{item.name}</p><p className="text-[9px] text-muted-foreground font-mono uppercase">{item.sku || "No SKU"}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[9px] h-4 uppercase">{item.item_type}</Badge></TableCell>
                    <TableCell><p className="font-bold text-xs">{item.current_stock} <span className="text-[9px] text-muted-foreground font-normal uppercase">{item.uom?.abbreviation || item.unit}</span></p></TableCell>
                    <TableCell>
                       <div className="flex gap-1">
                          {item.tax_applicability?.map(t => <Badge key={t} variant="outline" className="text-[8px] h-4 px-1">{t}</Badge>)}
                          {(!item.tax_applicability || item.tax_applicability.length === 0) && <span className="text-[9px] text-muted-foreground">Exempt</span>}
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Adjust Stock" onClick={() => { setSelectedItem(item); setAdjustStockOpen(true); }}><ArrowUpDown className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Store View" onClick={() => { setSelectedItem(item); setStoreStockOpen(true); }}><Warehouse className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" title="Generate Barcode" onClick={() => { setSelectedItem(item); setIsLabelOpen(true); }}><Barcode className="h-3 w-3" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Item Register Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
         <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Item Master Registration</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4 pr-2">
               <div className="col-span-2 space-y-1"><Label className="text-xs">Item Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Absolut Vodka 750ml" /></div>

               <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
                     <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                     <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>

               <div className="space-y-1">
                  <Label className="text-xs">SKU / Barcode</Label>
                  <div className="flex gap-1">
                     <Input value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} className="font-mono text-xs h-9" />
                     <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={generateSKU}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
               </div>

               <div className="space-y-1"><Label className="text-xs">UoM</Label>
                  <Select value={form.uom_id} onValueChange={(v) => setForm({...form, uom_id: v})}>
                     <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                     <SelectContent>{uoms.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-1"><Label className="text-xs">Item Type</Label>
                  <Select value={form.item_type} onValueChange={(v) => setForm({...form, item_type: v})}>
                     <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="consumable">Consumable</SelectItem>
                        <SelectItem value="asset">Asset (Operating Eq.)</SelectItem>
                        <SelectItem value="raw_material">Raw Material</SelectItem>
                     </SelectContent>
                  </Select>
               </div>

               <div className="space-y-1"><Label className="text-xs">Min Stock</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({...form, min_stock: Number(e.target.value)})} /></div>
               <div className="space-y-1"><Label className="text-xs">Max Stock</Label><Input type="number" value={form.max_stock} onChange={(e) => setForm({...form, max_stock: Number(e.target.value)})} /></div>
               <div className="space-y-1"><Label className="text-xs">Safety Stock</Label><Input type="number" value={form.safety_stock} onChange={(e) => setForm({...form, safety_stock: Number(e.target.value)})} /></div>
               <div className="space-y-1"><Label className="text-xs">Reorder Point</Label><Input type="number" value={form.reorder_point} onChange={(e) => setForm({...form, reorder_point: Number(e.target.value)})} /></div>
               <div className="space-y-1"><Label className="text-xs">Temp. Classification</Label>
                  <Select value={form.temperature_classification} onValueChange={(v) => setForm({...form, temperature_classification: v})}>
                     <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Ambient">Ambient / Dry</SelectItem>
                        <SelectItem value="Chilled">Chilled (0-5°C)</SelectItem>
                        <SelectItem value="Frozen">Frozen (-18°C)</SelectItem>
                     </SelectContent>
                  </Select>
               </div>

               <div className="space-y-1"><Label className="text-xs">Shelf Life (Days)</Label><Input type="number" value={form.shelf_life} onChange={(e) => setForm({...form, shelf_life: e.target.value})} /></div>
               <div className="space-y-1"><Label className="text-xs">Storage Instructions</Label><Input value={form.storage_instructions} onChange={(e) => setForm({...form, storage_instructions: e.target.value})} placeholder="e.g. Keep away from light" /></div>

               <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Item Image</Label>
                  <div className="flex items-center gap-4">
                     <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center border overflow-hidden">
                        {form.image_url ? <img src={form.image_url} className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                     </div>
                     <div className="flex-1 space-y-2">
                        <Input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
                        <p className="text-[10px] text-muted-foreground">JPG, PNG or WEBP. Max 2MB.</p>
                     </div>
                  </div>
               </div>

               <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-xl space-y-2 border">
                     <Label className="text-[10px] font-bold uppercase text-primary flex items-center gap-1"><Percent className="h-3 w-3" /> Tax Applicability</Label>
                     <div className="flex flex-wrap gap-2">
                        {["VAT 13%", "Service Tax 10%", "Tourism Levy 2%", "Excise Duty"].map(t => (
                           <Button key={t} variant={form.tax_applicability.includes(t) ? "blue" : "outline"} size="xs" className="h-7 text-[10px]" onClick={() => toggleTax(t)}>{t}</Button>
                        ))}
                     </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl space-y-2 border">
                     <Label className="text-[10px] font-bold uppercase text-primary flex items-center gap-1"><Settings className="h-3 w-3" /> Custom Attributes</Label>
                     <div className="space-y-2">
                        <div className="flex gap-2">
                           <Input placeholder="Key" className="h-7 text-[10px] w-20" id="attr-key" />
                           <Input placeholder="Value" className="h-7 text-[10px] flex-1" id="attr-val" />
                           <Button size="xs" variant="blue" className="h-7" onClick={() => {
                              const k = (document.getElementById('attr-key') as HTMLInputElement).value;
                              const v = (document.getElementById('attr-val') as HTMLInputElement).value;
                              if (k && v) {
                                 setForm({...form, attributes: {...form.attributes, [k]: v}});
                                 (document.getElementById('attr-key') as HTMLInputElement).value = '';
                                 (document.getElementById('attr-val') as HTMLInputElement).value = '';
                              }
                           }}>+</Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                           {Object.entries(form.attributes).map(([k, v]) => (
                              <Badge key={k} variant="secondary" className="text-[8px] h-4 gap-1">
                                 {k}: {v}
                                 <XCircle className="h-2 w-2 cursor-pointer" onClick={() => {
                                    const next = {...form.attributes};
                                    delete next[k];
                                    setForm({...form, attributes: next});
                                 }} />
                              </Badge>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
               <Button variant="blue" onClick={handleCreate}>Save Master Record</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Reusing existing Store and Adjustment dialogs */}
      <Dialog open={adjustStockOpen} onOpenChange={setAdjustStockOpen}>
         <DialogContent>
            <DialogHeader><DialogTitle>Stock Correction: {selectedItem?.name}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Type</Label>
                     <Select value={stockAdj.type} onValueChange={(v) => setStockAdj({...stockAdj, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="in">Increase (+)</SelectItem><SelectItem value="out">Decrease (-)</SelectItem></SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1"><Label>Quantity</Label><Input type="number" onChange={(e) => setStockAdj({...stockAdj, quantity: Number(e.target.value)})} /></div>
               </div>
               <div className="space-y-1"><Label>Reason</Label>
                  <Select value={stockAdj.reason} onValueChange={(v) => setStockAdj({...stockAdj, reason: v})}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Physical Count">Physical Count Variance</SelectItem>
                        <SelectItem value="Damage">Damage / Broken</SelectItem>
                        <SelectItem value="Expiry">Expired Goods</SelectItem>
                        <SelectItem value="Theft">Missing / Theft</SelectItem>
                        <SelectItem value="Loss">Processing Loss</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1"><Label>Notes</Label><Input placeholder="Additional comments..." onChange={(e) => setStockAdj({...stockAdj, notes: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={handleAdjustRequest}>Submit for Approval</Button></DialogFooter>
         </DialogContent>
      </Dialog>
      <Dialog open={storeStockOpen} onOpenChange={setStoreStockOpen}><DialogContent><DialogHeader><DialogTitle>Distribution: {selectedItem?.name}</DialogTitle></DialogHeader><div className="py-4">{stores.map(s => <div key={s.id} className="flex justify-between p-2 border-b text-xs"><span>{s.name}</span><span className="font-bold">0</span></div>)}</div></DialogContent></Dialog>
      <Dialog open={pendingAdjOpen} onOpenChange={setPendingAdjOpen}><DialogContent><DialogHeader><DialogTitle>Pending Approvals</DialogTitle></DialogHeader><div className="py-4">{pendingAdjustments.map((a) => <div key={a.id} className="flex justify-between items-center p-2 border-b text-xs"><span>{a.item?.name} ({a.quantity})</span><Button size="xs" onClick={() => approveAdjustment(a)}>Approve</Button></div>)}</div></DialogContent></Dialog>

      <Dialog open={isLabelOpen} onOpenChange={setIsLabelOpen}>
         <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Barcode Label Generator</DialogTitle></DialogHeader>
            <div className="py-8 flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-200">
               <div className="text-center space-y-1 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inventory Asset</p>
                  <p className="text-sm font-bold">{selectedItem?.name}</p>
               </div>

               <div className="bg-slate-50 p-4 rounded border flex flex-col items-center">
                  <Barcode className="h-12 w-48 text-slate-900" />
                  <p className="mt-2 font-mono text-sm font-bold tracking-[0.2em]">{selectedItem?.sku || 'NO-SKU'}</p>
               </div>

               <div className="mt-4 flex gap-4 text-[10px] font-bold uppercase text-slate-500">
                  <span>Price: {formatCurrency(selectedItem?.cost_price || 0)}</span>
                  <span>•</span>
                  <span>Unit: {selectedItem?.unit}</span>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" className="w-full" onClick={() => window.print()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Print Labels (Batch)
               </Button>
               <Button variant="blue" className="w-full" onClick={() => setIsLabelOpen(false)}>
                  <Download className="h-4 w-4 mr-2" /> Download SVG
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
