import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Store, Loader2, Edit, Trash2, MapPin, Thermometer, Wind, User } from "lucide-react";
import { toast } from "sonner";
import { useInventoryStores } from "@/hooks/inventory";
import { useStaffMembers } from "@/hooks/useStaffMembers";

export function StoresTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: stores = [], isLoading, createStore, updateStore } = useInventoryStores();
  const { data: staff = [] } = useStaffMembers();
  const [form, setForm] = useState({
    name: "",
    code: "",
    location: "",
    property: "Main Hotel",
    store_type: "general",
    temperature_classification: "Ambient",
    storage_conditions: "Standard Shelf"
  });

  const handleCreate = async () => {
    try {
      await createStore.mutateAsync({
        name: form.name,
        code: form.code,
        location: form.location,
        store_type: form.store_type,
        temperature_classification: form.temperature_classification,
        storage_conditions: form.storage_conditions,
        is_active: true,
        store_manager_id: (form as any).store_manager_id || null
      });
      toast.success("Store created");
      setIsAddOpen(false);
      setForm({
        name: "", code: "", location: "", property: "Main Hotel", store_type: "general",
        temperature_classification: "Ambient", storage_conditions: "Standard Shelf"
      });
    } catch (error: any) {
      console.error("Create store error:", error);
      toast.error(error.message || "Failed to create store");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Stores & Warehouses</h3>
          <p className="text-sm text-muted-foreground">Manage multi-location inventory and storage conditions</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button variant="blue" className="gap-2"><Plus className="h-4 w-4" />Add Store</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Store</DialogTitle><DialogDescription>Create a new storage location</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2"><Label>Store Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Property / Branch</Label>
                 <Select value={form.property} onValueChange={(v) => setForm({...form, property: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="Main Hotel">Main Hotel</SelectItem>
                       <SelectItem value="City Branch">City Branch</SelectItem>
                       <SelectItem value="Resort Wing">Resort Wing</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2"><Label>Store Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MAIN-01" /></div>
              <div className="space-y-2"><Label>Store Type</Label>
                <Select value={form.store_type} onValueChange={(v) => setForm({ ...form, store_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Store</SelectItem>
                    <SelectItem value="kitchen">Kitchen Store</SelectItem>
                    <SelectItem value="bar">Bar Store</SelectItem>
                    <SelectItem value="housekeeping">Housekeeping Store</SelectItem>
                    <SelectItem value="engineering">Engineering Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Temperature Class</Label>
                 <Select value={form.temperature_classification} onValueChange={(v) => setForm({...form, temperature_classification: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="Ambient">Ambient (Normal)</SelectItem>
                       <SelectItem value="Chilled">Chilled (0-5°C)</SelectItem>
                       <SelectItem value="Frozen">Frozen (&lt;-18°C)</SelectItem>
                       <SelectItem value="Heated">Heated</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2"><Label>Storage Conditions</Label><Input value={form.storage_conditions} onChange={(e) => setForm({ ...form, storage_conditions: e.target.value })} placeholder="e.g. Dry, No Sunlight" /></div>
              <div className="col-span-2 space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="col-span-2 space-y-2">
                 <Label>Store Manager</Label>
                 <Select value={(form as any).store_manager_id} onValueChange={(v) => setForm({...form, store_manager_id: v} as any)}>
                    <SelectTrigger><SelectValue placeholder="Assign manager..." /></SelectTrigger>
                    <SelectContent>
                       {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name || !form.code || createStore.isPending} variant="blue">
                {createStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : stores.length === 0 ? (
          <div className="col-span-full text-center py-10 border rounded-lg bg-muted/20 text-muted-foreground">No stores configured</div>
        ) : (
          stores.map((store) => (
            <Card key={store.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{store.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground font-mono">{store.code}</p>
                        <Badge variant="outline" className="text-[8px] h-3 px-1">Main</Badge>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize text-[10px]">{store.store_type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                   <div className="flex items-center gap-1 text-muted-foreground"><Thermometer className="h-3 w-3" /> {store.temperature_classification || 'Ambient'}</div>
                   <div className="flex items-center gap-1 text-muted-foreground"><Wind className="h-3 w-3" /> {store.storage_conditions || 'Standard'}</div>
                </div>

                <div className="flex flex-col gap-2 text-xs text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-2">
                       <MapPin className="h-3 w-3" /> {store.location || "Internal"}
                    </div>
                    <div className="flex items-center gap-2">
                       <User className="h-3 w-3" />
                       {store.store_manager_id ?
                          staff.find(s => s.id === store.store_manager_id)?.first_name + " " + staff.find(s => s.id === store.store_manager_id)?.last_name :
                          "No Manager Assigned"}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" className="h-7 text-xs">Manage</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
