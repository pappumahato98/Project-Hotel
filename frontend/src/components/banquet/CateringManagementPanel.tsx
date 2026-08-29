import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Leaf,
  AlertTriangle,
  Package,
  Users,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useCateringOrders, useCreateCateringOrder, useUpdateCateringOrder } from "@/hooks/useBanquetData";

interface BanquetEvent {
  id: string;
  event_name: string;
  event_type: string;
  client_name: string;
  event_date: string;
  venue: string;
  guest_count: number;
  status: "inquiry" | "confirmed" | "in_progress" | "completed" | "cancelled";
  menu_package: string | null;
  special_requests: string | null;
}

interface CateringOrder {
  id: string;
  event_id: string;
  menu_package: string;
  dietary_requirements: string[];
  serving_style: string;
  beverage_selections: string[];
  special_instructions: string | null;
  total_cost: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "served";
}

interface CateringManagementPanelProps {
  events: BanquetEvent[];
}

const menuPackages = [
  { id: "standard", name: "Standard Buffet", pricePerHead: 45 },
  { id: "premium", name: "Premium Buffet", pricePerHead: 75 },
  { id: "deluxe", name: "Deluxe Plated", pricePerHead: 95 },
  { id: "gourmet", name: "Gourmet Experience", pricePerHead: 125 },
  { id: "custom", name: "Custom Menu", pricePerHead: 0 },
];

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Kosher",
  "Nut-Free",
  "Dairy-Free",
  "Seafood-Free",
];

const servingStyles = ["Buffet", "Plated Service", "Family Style", "Cocktail", "Food Stations"];

const beverageOptions = [
  "Soft Drinks",
  "Juices",
  "Coffee & Tea",
  "Wine Selection",
  "Full Bar",
  "Mocktails",
  "Signature Cocktails",
];

export function CateringManagementPanel({ events }: CateringManagementPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BanquetEvent | null>(null);

  const { data: cateringOrders = [], isLoading } = useCateringOrders();
  const createOrder = useCreateCateringOrder();
  const updateOrder = useUpdateCateringOrder();

  const [newOrder, setNewOrder] = useState({
    menuPackage: "standard",
    courses: [] as string[],
    dietaryRequirements: [] as string[],
    servingStyle: "Buffet",
    beverages: [] as string[],
    specialNotes: "",
  });

  const [searchParams, setSearchParams] = useSearchParams();

  // Filter active events
  const activeEvents = useMemo(() => {
    return events.filter(
      (e) =>
        e.status !== "completed" &&
        e.status !== "cancelled" &&
        (e.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [events, searchQuery]);

  // Auto-open dialog if directed from quick setup
  useEffect(() => {
    const setupEventId = searchParams.get("setupEvent");
    const action = searchParams.get("setupAction");
    
    if (setupEventId && action === "add_catering") {
      const event = events.find(e => e.id === setupEventId);
      if (event) {
        handleOpenOrderDialog(event);
        // Clear params after opening
        setSearchParams(prev => {
          prev.delete("setupEvent");
          prev.delete("setupAction");
          return prev;
        });
      }
    }
  }, [searchParams, events]);

  // Get catering order for an event
  const getOrderForEvent = (eventId: string) => {
    return cateringOrders.find((o) => o.event_id === eventId);
  };

  const handleOpenOrderDialog = (event: BanquetEvent) => {
    setSelectedEvent(event);
    const existingOrder = getOrderForEvent(event.id);
    if (existingOrder) {
      setNewOrder({
        menuPackage: existingOrder.menu_package,
        courses: [],
        dietaryRequirements: existingOrder.dietary_requirements,
        servingStyle: existingOrder.serving_style,
        beverages: existingOrder.beverage_selections,
        specialNotes: existingOrder.special_instructions || "",
      });
    } else {
      setNewOrder({
        menuPackage: "standard",
        courses: [],
        dietaryRequirements: [],
        servingStyle: "Buffet",
        beverages: ["Soft Drinks", "Coffee & Tea"],
        specialNotes: event.special_requests || "",
      });
    }
    setOrderDialogOpen(true);
  };

  const handleSaveOrder = async () => {
    if (!selectedEvent) return;

    const pkg = menuPackages.find((p) => p.id === newOrder.menuPackage);
    const estimatedCost = (pkg?.pricePerHead || 0) * selectedEvent.guest_count;
    const existingOrder = getOrderForEvent(selectedEvent.id);

    const orderData = {
      event_id: selectedEvent.id,
      menu_package: newOrder.menuPackage,
      dietary_requirements: newOrder.dietaryRequirements,
      serving_style: newOrder.servingStyle,
      beverage_selections: newOrder.beverages,
      special_instructions: newOrder.specialNotes,
      total_cost: estimatedCost,
      status: (existingOrder?.status || "pending") as any,
    };

    if (existingOrder) {
      await updateOrder.mutateAsync({
        id: existingOrder.id,
        updates: orderData as any
      });
    } else {
      await createOrder.mutateAsync(orderData as any);
    }

    setOrderDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleToggleDietary = (diet: string) => {
    setNewOrder((prev) => ({
      ...prev,
      dietaryRequirements: prev.dietaryRequirements.includes(diet)
        ? prev.dietaryRequirements.filter((d) => d !== diet)
        : [...prev.dietaryRequirements, diet],
    }));
  };

  const handleToggleBeverage = (bev: string) => {
    setNewOrder((prev) => ({
      ...prev,
      beverages: prev.beverages.includes(bev)
        ? prev.beverages.filter((b) => b !== bev)
        : [...prev.beverages, bev],
    }));
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await updateOrder.mutateAsync({
      id: orderId,
      updates: { status: status as any }
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    preparing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    ready: "bg-success/20 text-success border-success/30",
    served: "bg-muted text-muted-foreground border-muted",
  };

  if (activeEvents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">No Active Catering Events</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              There are currently no active events requiring catering setup. Create a new event or confirm an inquiry to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{cateringOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {cateringOrders.filter((o) => o.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <UtensilsCrossed className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Preparing</p>
                <p className="text-2xl font-bold">
                  {cateringOrders.filter((o) => o.status === "preparing").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Leaf className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dietary Requests</p>
                <p className="text-2xl font-bold">
                  {cateringOrders.reduce((s, o: any) => s + (o.dietary_requirements?.length || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Events with Catering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Event Catering Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No active events</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Menu Package</TableHead>
                  <TableHead>Dietary</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEvents.map((event) => {
                  const order = getOrderForEvent(event.id);
                  const pkg = order
                    ? menuPackages.find((p) => p.id === order.menu_package)
                    : null;
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary"
                          onClick={() => handleOpenOrderDialog(event)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.event_name}</p>
                          <p className="text-xs text-muted-foreground">{event.client_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{event.event_date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {event.guest_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order ? (
                          <Badge variant="outline">{pkg?.name || order.menu_package}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order && order.dietary_requirements?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {order.dietary_requirements.slice(0, 2).map((d) => (
                              <Badge key={d} variant="secondary" className="text-xs">
                                {d}
                              </Badge>
                            ))}
                            {order.dietary_requirements.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{order.dietary_requirements.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {order ? `$${order.total_cost.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell>
                        {order ? (
                          <Select
                            value={order.status}
                            onValueChange={(v: CateringOrder["status"]) =>
                              updateOrderStatus(order.id, v)
                            }
                          >
                            <SelectTrigger className="w-28">
                              <Badge variant="outline" className={statusColors[order.status]}>
                                {order.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="served">Served</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="bg-muted">
                            No order
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOrderDialog(event)}
                        >
                          {order ? "Edit" : "Add"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? `Catering for ${selectedEvent.event_name}` : "Catering Order"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && (
                <span>
                  {selectedEvent.guest_count} guests • {selectedEvent.event_date} • {selectedEvent.venue}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Menu Package */}
            <div className="space-y-2">
              <Label>Menu Package</Label>
              <Select
                value={newOrder.menuPackage}
                onValueChange={(v) => setNewOrder((p) => ({ ...p, menuPackage: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {menuPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex justify-between items-center gap-4">
                        <span>{pkg.name}</span>
                        {pkg.pricePerHead > 0 && (
                          <span className="text-muted-foreground">
                            ${pkg.pricePerHead}/head
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serving Style */}
            <div className="space-y-2">
              <Label>Serving Style</Label>
              <Select
                value={newOrder.servingStyle}
                onValueChange={(v) => setNewOrder((p) => ({ ...p, servingStyle: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {servingStyles.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dietary Requirements */}
            <div className="space-y-2">
              <Label>Dietary Requirements</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dietaryOptions.map((diet) => (
                  <div
                    key={diet}
                    className="flex items-center space-x-2 p-2 rounded-lg border cursor-pointer hover:bg-secondary/50"
                    onClick={() => handleToggleDietary(diet)}
                  >
                    <Checkbox checked={newOrder.dietaryRequirements.includes(diet)} />
                    <span className="text-sm">{diet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Beverages */}
            <div className="space-y-2">
              <Label>Beverages</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {beverageOptions.map((bev) => (
                  <div
                    key={bev}
                    className="flex items-center space-x-2 p-2 rounded-lg border cursor-pointer hover:bg-secondary/50"
                    onClick={() => handleToggleBeverage(bev)}
                  >
                    <Checkbox checked={newOrder.beverages.includes(bev)} />
                    <span className="text-sm">{bev}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Notes */}
            <div className="space-y-2">
              <Label>Special Notes</Label>
              <Textarea
                placeholder="Any special requirements, allergies, or preferences..."
                value={newOrder.specialNotes}
                onChange={(e) => setNewOrder((p) => ({ ...p, specialNotes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Estimated Cost */}
            {selectedEvent && (
              <div className="p-4 rounded-lg bg-secondary/50 border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="text-2xl font-bold">
                    $
                    {(
                      (menuPackages.find((p) => p.id === newOrder.menuPackage)?.pricePerHead ||
                        0) * selectedEvent.guest_count
                    ).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {selectedEvent.guest_count} guests × $
                  {menuPackages.find((p) => p.id === newOrder.menuPackage)?.pricePerHead || 0}/head
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveOrder}>Save Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
