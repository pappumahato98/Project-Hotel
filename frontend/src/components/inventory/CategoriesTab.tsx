import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, FolderTree, Barcode } from "lucide-react";
import { toast } from "sonner";
import { useInventoryCategories, useInventoryItems, InventoryCategory } from "@/hooks/inventory";

export function CategoriesTab() {
  const { data: categories = [], createCategory, updateCategory, deleteCategory } = useInventoryCategories();
  const { data: items = [] } = useInventoryItems();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", parent_id: "", sku_prefix: "" });

  const getItemCount = (catId: string) => items.filter((i) => i.category_id === catId).length;
  const getParentName = (parentId: string | null) => categories.find((c) => c.id === parentId)?.name || "-";

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        parent_id: form.parent_id || null,
        sku_prefix: form.sku_prefix || null
      };
      if (editId) {
        await updateCategory.mutateAsync({ id: editId, ...payload });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync(payload);
        toast.success("Category created");
      }
      setOpen(false);
      setEditId(null);
      setForm({ name: "", description: "", parent_id: "", sku_prefix: "" });
    } catch (error: any) {
      console.error("Save category error:", error);
      toast.error(error.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string) => {
    if (getItemCount(id) > 0) { toast.error("Cannot delete category with items"); return; }
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch (error: any) {
      console.error("Delete category error:", error);
      toast.error(error.message || "Failed to delete category");
    }
  };

  const openEdit = (cat: InventoryCategory) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      sku_prefix: cat.sku_prefix || ""
    });
    setOpen(true);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5" />Categories</CardTitle><CardDescription>Manage item groups and automatic SKU rules</CardDescription></div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm({ name: "", description: "", parent_id: "", sku_prefix: "" }); } }}>
            <DialogTrigger asChild><Button variant="blue" className="gap-2"><Plus className="h-4 w-4" />Add Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><Barcode className="h-4 w-4" /> SKU Prefix</Label>
                   <Input value={form.sku_prefix} onChange={(e) => setForm({ ...form, sku_prefix: e.target.value.toUpperCase() })} placeholder="e.g. FOD, BEV" maxLength={4} />
                   <p className="text-[10px] text-muted-foreground italic">Used for automatic SKU generation for items in this category.</p>
                </div>
                <div className="space-y-2"><Label>Parent Category</Label>
                  <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="None (top level)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top level)</SelectItem>
                      {categories.filter((c) => c.id !== editId).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!form.name || createCategory.isPending || updateCategory.isPending}>
                  {(createCategory.isPending || updateCategory.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editId ? "Save" : "Create"}
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
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No categories yet</TableCell></TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                     <div className="font-medium">{cat.name}</div>
                     <div className="text-[10px] text-muted-foreground line-clamp-1">{cat.description}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="font-mono text-[10px]">{cat.sku_prefix || "NONE"}</Badge></TableCell>
                  <TableCell className="text-xs">{getParentName(cat.parent_id)}</TableCell>
                  <TableCell><span className="font-bold text-xs">{getItemCount(cat.id)}</span> items</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
