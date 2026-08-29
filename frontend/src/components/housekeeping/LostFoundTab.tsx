import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { 
  Plus, Package, Search, Filter, Loader2, Eye, Check
} from "lucide-react";
import { toast } from "sonner";
import { useLostAndFound, LostAndFound } from "@/hooks/useHousekeeping";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  stored: { label: "Stored", color: "bg-blue-500/20 text-blue-400" },
  claimed: { label: "Claimed", color: "bg-success/20 text-success" },
  disposed: { label: "Disposed", color: "bg-muted text-muted-foreground" },
  returned: { label: "Returned", color: "bg-primary/20 text-primary" },
};

const categoryOptions = [
  "Electronics", "Clothing", "Jewelry", "Documents", "Keys", "Bags", "Accessories", "Other"
];

export function LostFoundTab() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostAndFound | null>(null);
  const [claimInfo, setClaimInfo] = useState({ claimedBy: "", notes: "" });

  const { data: items = [], isLoading, createItem, claimItem, updateItem } = useLostAndFound(
    filterStatus !== "all" ? filterStatus : undefined
  );

  const [newItem, setNewItem] = useState({
    item_description: "",
    found_location: "",
    found_by: "",
    category: "",
    storage_location: "",
    notes: "",
  });

  const filteredItems = items.filter((item) => {
    return (
      item.item_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.found_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateItem = async () => {
    if (!newItem.item_description || !newItem.found_location) {
      toast.error("Please fill in required fields");
      return;
    }
    
    try {
      await createItem.mutateAsync({ 
        ...newItem, 
        found_date: new Date().toISOString().split("T")[0], 
        status: "stored" 
      } as any);
      toast.success("Lost item recorded");
      setDialogOpen(false);
      setNewItem({ item_description: "", found_location: "", found_by: "", category: "", storage_location: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleClaim = async () => {
    if (!selectedItem || !claimInfo.claimedBy) {
      toast.error("Please enter claimant name");
      return;
    }
    
    try {
      await claimItem.mutateAsync({ 
        id: selectedItem.id, 
        claimedBy: claimInfo.claimedBy 
      });
      toast.success("Item marked as claimed");
      setClaimDialogOpen(false);
      setSelectedItem(null);
      setClaimInfo({ claimedBy: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openClaimDialog = (item: LostAndFound) => {
    setSelectedItem(item);
    setClaimDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Lost & Found Registry
              </CardTitle>
              <CardDescription>Track found items and claims</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="blue" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Record Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Found Item</DialogTitle>
                  <DialogDescription>Enter details of the found item</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Item Description *</Label>
                    <Input 
                      value={newItem.item_description}
                      onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                      placeholder="e.g., Black leather wallet with cards"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Found Location *</Label>
                      <Input
                        value={newItem.found_location}
                        onChange={(e) => setNewItem({ ...newItem, found_location: e.target.value })}
                        placeholder="e.g., Room 101, Lobby"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Found By</Label>
                      <Input 
                        value={newItem.found_by}
                        onChange={(e) => setNewItem({ ...newItem, found_by: e.target.value })}
                        placeholder="Staff name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Storage Location</Label>
                      <Input 
                        value={newItem.storage_location}
                        onChange={(e) => setNewItem({ ...newItem, storage_location: e.target.value })}
                        placeholder="e.g., Front desk safe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea 
                      value={newItem.notes}
                      onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                      placeholder="Any additional details..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                    {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Record Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search items..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="stored">Stored</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Found Location</TableHead>
                    <TableHead>Found Date</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No items found. Click "Record Item" to add a found item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_description}</p>
                            {item.found_by && (
                              <p className="text-xs text-muted-foreground">By: {item.found_by}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category || "Uncategorized"}</Badge>
                        </TableCell>
                        <TableCell>{item.found_location}</TableCell>
                        <TableCell className="text-sm">{formatAD(new Date(item.found_date))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.storage_location || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[item.status]?.color}>
                            {statusConfig[item.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.status === "stored" && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1"
                                onClick={() => openClaimDialog(item)}
                              >
                                <Check className="h-3 w-3" />
                                Claim
                              </Button>
                            )}
                            {item.status === "claimed" && item.claimed_by && (
                              <span className="text-xs text-muted-foreground">
                                By: {item.claimed_by}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Item</DialogTitle>
            <DialogDescription>
              {selectedItem?.item_description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Claimant Name *</Label>
              <Input 
                value={claimInfo.claimedBy}
                onChange={(e) => setClaimInfo({ ...claimInfo, claimedBy: e.target.value })}
                placeholder="Name of person claiming the item"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={claimInfo.notes}
                onChange={(e) => setClaimInfo({ ...claimInfo, notes: e.target.value })}
                placeholder="ID verification details, contact info, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleClaim} disabled={!claimInfo.claimedBy || claimItem.isPending}>
              {claimItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mark as Claimed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
