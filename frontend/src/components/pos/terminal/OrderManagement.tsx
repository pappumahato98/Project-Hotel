import React, { useState, useMemo } from "react";
import { usePOSTerminal } from "@/hooks/pos/usePOSTerminal";
import { useMenuItems, useMenuCategories } from "@/hooks/useMenuItems";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  User,
  ChefHat,
  History,
  Search,
  Wine,
  Flame,
  Clock,
  AlertTriangle,
  Minus,
  Plus,
  Trash2,
  ChevronRight,
  ArrowRight,
  CalendarClock,
  PauseCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderManagementProps {
  orderId: string;
  tableId: string;
  onBilling: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orderId, tableId, onBilling }) => {
  const { activeOrders, menuItems, addOrderItem, fireOrder, getKitchenLoad, getWinePairing, isLoading } = usePOSTerminal();
  const { data: categories = [] } = useMenuCategories();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeat, setSelectedSeat] = useState(1);

  const order = useMemo(() => activeOrders.find(o => o.id === orderId), [activeOrders, orderId]);
  const kitchenLoad = getKitchenLoad();

  const filteredItems = useMemo(() => {
    return (menuItems as any[]).filter(item => {
      const name = item.item_name || item.name || "";
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory || item.category?.id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  const totals = useMemo(() => {
    if (!order?.pos_order_items) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = order.pos_order_items.reduce((acc: number, i: any) => acc + (i.item_price * i.quantity), 0);
    const tax = subtotal * 0.1; // 10%
    return { subtotal, tax, total: subtotal + tax };
  }, [order?.pos_order_items]);

  const handleAddItem = (item: any) => {
    if (item.current_stock <= 0) return;
    addOrderItem.mutate({
      orderId,
      itemName: item.item_name || item.name,
      itemPrice: item.item_price || item.price,
      category: item.category?.name || item.category || "Other",
      quantity: 1,
      seatNumber: selectedSeat
    });
  };

  if (isLoading && !order) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Syncing table data...</p>
      </div>
    );
  }

  if (!order) return <div className="h-full flex items-center justify-center">Select a table to start ordering</div>;

  return (
    <div className="flex h-full gap-4 overflow-hidden">

      {/* Card 1: Identity & Recognition (Guest IQ) */}
      <div className="w-1/4 h-full flex flex-col gap-4">
        <Card className="shrink-0 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Identity & Recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {order.guest?.first_name?.[0] || "G"}
              </div>
              <div>
                <p className="text-sm font-bold">{order.guest?.first_name || "Walk-in"} {order.guest?.last_name || "Guest"}</p>
                <p className="text-xs text-muted-foreground">Server: {order.server_name}</p>
              </div>
            </div>

            {order.guest?.vip_tier && (
               <Badge className="w-full justify-center bg-amber-500 hover:bg-amber-600 border-none">
                 {order.guest.vip_tier} Tier Member
               </Badge>
            )}

            <div className="p-3 rounded-lg bg-background border space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Plan</p>
              <Badge variant="outline" className="w-full justify-center text-xs">
                {order.reservation?.meal_plan || "Room Only"}
              </Badge>
            </div>

            {order.guest?.allergies && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Allergy Alert
                </p>
                <p className="text-xs font-bold text-red-700">{order.guest.allergies}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Guest History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-full pr-2">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground italic">No recent history available</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Card 2: Order Point (Smart Menu) */}
      <Card className="flex-1 h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-4 shrink-0 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu or scan..."
                className="pl-9 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold shrink-0",
              kitchenLoad === 'red' ? "bg-red-500 text-white" : kitchenLoad === 'yellow' ? "bg-yellow-500 text-black" : "bg-green-500 text-white"
            )}>
              <ChefHat className="h-4 w-4" />
              KITCHEN: {kitchenLoad === 'red' ? "AT CAPACITY" : kitchenLoad === 'yellow' ? "BUSY" : "AVAILABLE"}
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full px-4 h-8 shrink-0"
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full px-4 h-8 shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-8">
              {filteredItems.map(item => {
                const itemName = item.item_name || item.name;
                const itemPrice = item.item_price || item.price;
                const isOutOfStock = item.current_stock <= 0;
                const winePairing = getWinePairing(itemName);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className={cn(
                      "group relative flex flex-col p-4 bg-background border rounded-xl hover:border-primary hover:shadow-md cursor-pointer transition-all h-full",
                      isOutOfStock && "opacity-50 grayscale cursor-not-allowed bg-muted"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{itemName}</h3>
                      <span className="text-sm font-black text-primary">${itemPrice}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mb-4">{item.description || "Fresh ingredients prepared daily."}</p>

                    <div className="mt-auto flex items-center justify-between">
                      <Badge variant="outline" className={cn(
                        "text-[9px] h-4 tracking-tighter uppercase font-mono",
                        isOutOfStock && "text-red-500 border-red-500"
                      )}>
                        {isOutOfStock ? "SOLD OUT (86)" : (item.category?.name || item.category || "FOOD")}
                      </Badge>
                      {!isOutOfStock && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-primary text-[10px] font-bold">
                          <Plus className="h-3 w-3" /> ADD
                        </div>
                      )}
                    </div>

                    {/* Sommelier Suggestion Mode */}
                    {winePairing !== "Sommelier Selection" && (
                      <div className="absolute -top-2 -right-2">
                        <TooltipProvider>
                          <div className="group/wine relative">
                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg border-2 border-background animate-pulse">
                               <Wine className="h-3.5 w-3.5" />
                            </div>
                            <div className="absolute top-full right-0 mt-2 p-2 bg-purple-900 text-white text-[9px] font-bold rounded shadow-xl whitespace-nowrap opacity-0 group-hover/wine:opacity-100 transition-opacity z-50 flex flex-col pointer-events-none">
                              <span className="text-purple-200 uppercase tracking-widest text-[7px] mb-1">Sommelier Suggests</span>
                              {winePairing}
                            </div>
                          </div>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                );
              })}
              {!isLoading && filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No menu items found.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Card 3: Active Check & Amount (Financial Guard) */}
      <Card className="w-1/3 h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-2 border-b bg-muted/10">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg">Table #{order.table_number}</CardTitle>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map(s => (
                <Button
                  key={s}
                  variant={selectedSeat === s ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setSelectedSeat(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
            <span>Item</span>
            <div className="flex gap-12 pr-4">
              <span>Qty</span>
              <span>Price</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(seatNum => {
                const seatItems = order.pos_order_items?.filter((i: any) => i.seat_number === seatNum) || [];
                if (seatItems.length === 0 && seatNum !== selectedSeat) return null;

                return (
                  <div key={seatNum} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-muted" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Seat {seatNum}</span>
                      <div className="h-px flex-1 bg-muted" />
                    </div>

                    {seatItems.map((item: any) => (
                      <div key={item.id} className="flex flex-col group">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.item_name}</p>
                            {item.status === 'pending' && <Badge variant="outline" className="text-[9px] h-3 uppercase bg-amber-50">Draft</Badge>}
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="flex items-center gap-2">
                               <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full"><Minus className="h-3 w-3" /></Button>
                               <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                               <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full"><Plus className="h-3 w-3" /></Button>
                             </div>
                             <span className="text-sm font-bold text-right min-w-[50px]">${(item.item_price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                             <Clock className="h-3 w-3" /> Ordered {getTimer(item.created_at)}
                           </span>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100">
                             <Trash2 className="h-3 w-3" />
                           </Button>
                        </div>
                      </div>
                    ))}
                    {seatItems.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-2">No items for this seat</p>}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex-col gap-4 border-t pt-4 shrink-0 bg-muted/5">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax & Service (10%)</span>
              <span>${totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black border-t pt-2">
              <span>Total</span>
              <span className="text-primary">${totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 gap-2 border-primary/20 hover:bg-primary/5"
                  disabled={!order.pos_order_items?.some((i: any) => i.status === 'pending')}
                >
                  <Flame className="h-5 w-5 text-orange-500" />
                  FIRE OPTIONS
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                 <DropdownMenuItem onClick={() => fireOrder.mutate({ orderId })} className="flex items-center gap-2 h-10 cursor-pointer">
                    <Flame className="h-4 w-4 text-orange-500" /> FIRE NOW
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => fireOrder.mutate({ orderId, hold: true })} className="flex items-center gap-2 h-10 cursor-pointer">
                    <PauseCircle className="h-4 w-4 text-blue-500" /> HOLD ALL
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => fireOrder.mutate({ orderId, fireAt: new Date(Date.now() + 20 * 60000).toISOString() })} className="flex items-center gap-2 h-10 cursor-pointer">
                    <CalendarClock className="h-4 w-4 text-purple-500" /> FIRE DESSERT (20 MINS)
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="h-12 gap-2 border-primary/20 hover:bg-primary/5"
              onClick={() => fireOrder.mutate({ orderId })}
              disabled={!order.pos_order_items?.some((i: any) => i.status === 'pending')}
            >
              FIRE NOW
            </Button>

            <Button className="h-12 gap-2 shadow-lg" onClick={onBilling}>
              PAYMENT
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

const getTimer = (time: string) => {
  const diff = Math.floor((Date.now() - new Date(time).getTime()) / 60000);
  return `${diff}m ago`;
};
