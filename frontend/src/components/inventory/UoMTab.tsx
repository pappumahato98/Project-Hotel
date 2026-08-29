import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Ruler, Loader2, Edit, Trash2, ArrowRightLeft, Search, Download, Upload, Star, StarOff, X } from "lucide-react";
import { toast } from "sonner";
import { useInventoryUoMs } from "@/hooks/inventory";
import { format } from "date-fns";

export function UoMTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConvOpen, setIsConvOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUom, setSelectedUom] = useState<any>(null);
  
  const { 
    data: uoms = [], 
    isLoading, 
    conversions = [], 
    isConversionsLoading, 
    createUoM, 
    updateUoM,
    deleteUoM,
    createConversion, 
    deleteConversion 
  } = useInventoryUoMs();
  
  const [form, setForm] = useState({ name: "", abbreviation: "", is_base: false });
  const [convForm, setConvForm] = useState({ from_uom_id: "", to_uom_id: "", conversion_factor: 1 });

  const filteredUoms = useMemo(() => {
    if (!searchTerm) return uoms;
    return uoms.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.abbreviation && u.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [uoms, searchTerm]);

  const baseUom = uoms.find(u => u.is_base);

  const handleCreate = async () => {
    try {
      await createUoM.mutateAsync(form);
      toast.success("Unit of measurement created");
      setIsAddOpen(false);
      setForm({ name: "", abbreviation: "", is_base: false });
    } catch (error: any) {
      console.error("Create UoM error:", error);
      toast.error(error.message || "Failed to create UoM");
    }
  };

  const handleUpdate = async () => {
    if (!selectedUom) return;
    try {
      await updateUoM.mutateAsync({ 
        id: selectedUom.id, 
        name: selectedUom.name, 
        abbreviation: selectedUom.abbreviation,
        is_base: selectedUom.is_base 
      });
      toast.success("Unit updated successfully");
      setIsEditOpen(false);
      setSelectedUom(null);
    } catch (error: any) {
      console.error("Update UoM error:", error);
      toast.error(error.message || "Failed to update unit");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUoM.mutateAsync(id);
      toast.success("Unit deleted");
    } catch (error: any) {
      console.error("Delete UoM error:", error);
      toast.error(error.message || "Failed to delete unit");
    }
  };

  const handleCreateConv = async () => {
    try {
      if (!convForm.from_uom_id || !convForm.to_uom_id) {
        toast.error("Please select both units");
        return;
      }
      await createConversion.mutateAsync(convForm);
      toast.success("Conversion rule added");
      setConvForm({ from_uom_id: "", to_uom_id: "", conversion_factor: 1 });
    } catch (error: any) {
      console.error("Create conversion error:", error);
      toast.error(error.message || "Failed to add conversion");
    }
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await deleteConversion.mutateAsync(id);
      toast.success("Conversion rule removed");
    } catch (error: any) {
      console.error("Delete conversion error:", error);
      toast.error(error.message || "Failed to remove conversion");
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Name", "Abbreviation", "Is Base"].join(","),
      ...uoms.map(u => [u.name, u.abbreviation || "", u.is_base ? "Yes" : "No"].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `units-of-measurement-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Units exported to CSV");
  };

  const openEdit = (uom: any) => {
    setSelectedUom({ ...uom });
    setIsEditOpen(true);
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Units & Conversions</h3>
          <p className="text-sm text-muted-foreground">Manage units of measurement and their conversion rules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />Export
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsConvOpen(true)}>
            <ArrowRightLeft className="h-4 w-4" />Conversions
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="blue" className="gap-2">
                <Plus className="h-4 w-4" />Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Unit of Measurement</DialogTitle>
                <DialogDescription>Create a new unit for inventory items</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    placeholder="e.g. Kilogram, Box, Liter" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abbreviation</Label>
                  <Input 
                    value={form.abbreviation} 
                    onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} 
                    placeholder="e.g. kg, box, L" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="isBase" 
                    checked={form.is_base}
                    onCheckedChange={(checked) => setForm({ ...form, is_base: checked as boolean })}
                  />
                  <Label htmlFor="isBase" className="text-sm cursor-pointer">Set as base unit (for conversions)</Label>
                </div>
                {form.is_base && baseUom && (
                  <p className="text-xs text-amber-500">Note: "{baseUom.name}" is currently the base unit. This will replace it.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!form.name || createUoM.isPending} variant="blue">
                  {createUoM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search units..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{uoms.length} units</span>
          <span>{conversions.length} conversion rules</span>
          {baseUom && <Badge variant="outline" className="gap-1"><Star className="h-3 w-3 text-amber-500" />{baseUom.name}</Badge>}
        </div>
      </div>

      <Tabs defaultValue="units" className="w-full">
        <TabsList>
          <TabsTrigger value="units">Units ({uoms.length})</TabsTrigger>
          <TabsTrigger value="conversions">Conversions ({conversions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUoms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No units match your search" : "No units found. Add your first unit to get started."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Abbreviation</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUoms.map((uom) => {
                      const convCount = conversions.filter(c => c.from_uom_id === uom.id || c.to_uom_id === uom.id).length;
                      return (
                        <TableRow key={uom.id}>
                          <TableCell>
                            {uom.is_base ? (
                              <Badge className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                                <Star className="h-3 w-3" />Base
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Standard</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{uom.name}</TableCell>
                          <TableCell>{uom.abbreviation || "-"}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{convCount} rule(s)</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(uom)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(uom.id)}
                                disabled={deleteUoM.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Conversion rules define how to convert between different units. The base unit is used as the reference.
              </p>
              <Button variant="blue" size="sm" onClick={() => setIsConvOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Add Rule
              </Button>
            </div>
            
            {isConversionsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : conversions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversion rules defined</p>
                  <p className="text-sm text-muted-foreground">Add your first conversion rule to enable unit conversions</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {conversions.map((c) => (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Conversion Rule</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteConv(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-3 py-2">
                        <div className="text-center">
                          <Badge variant="blue" className="text-sm px-3 py-1">
                            1 {c.from_uom?.name || "Unit"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{c.from_uom?.abbreviation}</p>
                        </div>
                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                        <div className="text-center">
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {c.conversion_factor} {c.to_uom?.name || "Unit"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{c.to_uom?.abbreviation}</p>
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        1 {c.from_uom?.name} = {c.conversion_factor} {c.to_uom?.name}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit UoM Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update unit details</DialogDescription>
          </DialogHeader>
          {selectedUom && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={selectedUom.name} 
                  onChange={(e) => setSelectedUom({ ...selectedUom, name: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Abbreviation</Label>
                <Input 
                  value={selectedUom.abbreviation || ""} 
                  onChange={(e) => setSelectedUom({ ...selectedUom, abbreviation: e.target.value })} 
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="editBase" 
                  checked={selectedUom.is_base}
                  onCheckedChange={(checked) => setSelectedUom({ ...selectedUom, is_base: checked as boolean })}
                />
                <Label htmlFor="editBase" className="text-sm cursor-pointer">Set as base unit</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!selectedUom?.name || updateUoM.isPending} variant="blue">
              {updateUoM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Conversion Management Dialog */}
      <Dialog open={isConvOpen} onOpenChange={setIsConvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Unit Conversion Setup</DialogTitle>
            <DialogDescription>Define how different units relate to each other</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">From Unit</Label>
                <Select 
                  value={convForm.from_uom_id} 
                  onValueChange={(v) => setConvForm({...convForm, from_uom_id: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {uoms.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.abbreviation && `(${u.abbreviation})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">Factor</Label>
                <Input 
                  type="number" 
                  value={convForm.conversion_factor} 
                  onChange={(e) => setConvForm({...convForm, conversion_factor: Number(e.target.value)})}
                  className="font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">To Unit</Label>
                <Select 
                  value={convForm.to_uom_id} 
                  onValueChange={(v) => setConvForm({...convForm, to_uom_id: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {uoms.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {u.abbreviation && `(${u.abbreviation})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg text-sm border">
              <p className="font-medium">Preview:</p>
              <p className="text-muted-foreground">
                1 {uoms.find(u => u.id === convForm.from_uom_id)?.name || "From"} = {convForm.conversion_factor} {uoms.find(u => u.id === convForm.to_uom_id)?.name || "To"}
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No conversion rules yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    conversions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.from_uom?.name}</TableCell>
                        <TableCell>{c.conversion_factor}</TableCell>
                        <TableCell>{c.to_uom?.name}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteConv(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsConvOpen(false)}>Close</Button>
            <Button 
              onClick={handleCreateConv} 
              disabled={!convForm.from_uom_id || !convForm.to_uom_id || createConversion.isPending} 
              variant="blue"
            >
              {createConversion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}