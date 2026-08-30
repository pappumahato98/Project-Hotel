import { useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  Clock,
  Check,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePOSOrders, useUpdateOrderItemStatus } from "@/hooks/usePOS";
import { POSHeader } from "@/components/pos";

interface KitchenOrder {
  id: string;
  tableNumber: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    notes?: string;
    status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  }[];
  createdAt: string;
}

function playBeep() {
  // Browser audio requires user interaction first; we gate with the UI toggle.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = 880;
  g.gain.value = 0.06;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  setTimeout(() => {
    o.stop();
    ctx.close();
  }, 120);
}

export default function KitchenDisplay() {
  const { data: ordersData, isLoading, refetch } = usePOSOrders();
  const updateItem = useUpdateOrderItemStatus();

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const hasUserEnabledSound = useRef(false);

  const orders: KitchenOrder[] = useMemo(() => {
    // ordersData is a joined result: pos_orders + pos_order_items
    return (ordersData as any[])
      .filter((o) => !["paid", "cancelled"].includes(o.status))
      .map((o) => ({
        id: o.id as string,
        tableNumber: o.table_number as string,
        createdAt: (o.created_at as string) ?? new Date().toISOString(),
        items: ((o.pos_order_items ?? []) as any[])
          .filter((i) => !["served", "cancelled"].includes(i.status))
          .map((i) => ({
            id: i.id as string,
            name: i.item_name as string,
            quantity: i.quantity as number,
            notes: (i.notes as string | null) ?? undefined,
            status: i.status as KitchenOrder["items"][number]["status"],
          })),
      }))
      .filter((o) => o.items.length > 0);
  }, [ordersData]);

  // Real-time subscription + sound alert for new items
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-order-items")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pos_order_items" },
        (payload) => {
          setLastUpdate(new Date());
          refetch();

          if (soundEnabled && hasUserEnabledSound.current) {
            try {
              playBeep();
            } catch {
              // ignore audio errors
            }
          }

          const row = payload.new as any;
          toast.info("New kitchen item", {
            description: `${row.quantity ?? 1}× ${row.item_name ?? "Item"}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pos_order_items" },
        () => {
          setLastUpdate(new Date());
          refetch();
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, soundEnabled]);

  useEffect(() => {
    if (!isLoading) setLastUpdate(new Date());
  }, [ordersData, isLoading]);

  const updateItemStatus = async (itemId: string, status: "preparing" | "ready") => {
    try {
      await updateItem.mutateAsync({ itemId, status });
      toast.success(`Item marked as ${status}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update item status");
    }
  };

  const markAllReady = async (order: KitchenOrder) => {
    try {
      await Promise.all(
        order.items
          .filter((i) => i.status !== "ready")
          .map((i) => updateItem.mutateAsync({ itemId: i.id, status: "ready" }))
      );
      toast.success("All items marked as ready");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update order status");
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getTimeClass = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes > 20) return "text-destructive";
    if (minutes > 10) return "text-amber-400";
    return "text-muted-foreground";
  };

  const statusColors = {
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    preparing: "bg-primary/20 text-primary border-primary/30",
    ready: "bg-success/20 text-success border-success/30",
    served: "bg-muted text-muted-foreground border-muted",
    cancelled: "bg-destructive/20 text-destructive border-destructive/30",
  } as const;

  const pendingOrders = orders.filter((o) => o.items.some((i) => i.status === "pending"));
  const preparingOrders = orders.filter(
    (o) => o.items.some((i) => i.status === "preparing") && !o.items.some((i) => i.status === "pending")
  );
  const readyOrders = orders.filter((o) => o.items.length > 0 && o.items.every((i) => i.status === "ready"));

  if (isLoading) {
    return (
      <MainLayout title="Kitchen Display" subtitle="Real-time order management">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Kitchen Display" subtitle="Monitor and manage active food and bar orders">
      <POSHeader />
      <div className="space-y-6">
        {/* Enhanced Header with Stats */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/20">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{pendingOrders.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{preparingOrders.length}</p>
                <p className="text-sm text-muted-foreground">Preparing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/20">
                <Check className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{readyOrders.length}</p>
                <p className="text-sm text-muted-foreground">Ready</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) {
                  hasUserEnabledSound.current = true;
                  try {
                    playBeep();
                  } catch {
                    // ignore
                  }
                }
              }}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Sound {soundEnabled ? "On" : "Off"}
            </Button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
              {isRealtime ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm">{isRealtime ? "Live" : "Offline"}</span>
            </div>
            
            <span className="text-sm text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
            
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent>
              <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Active Orders</h3>
              <p className="text-muted-foreground">Orders will appear here when placed from the POS</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className={`${
                  order.items.some((i) => i.status === "pending")
                    ? "border-amber-500/50"
                    : order.items.every((i) => i.status === "ready")
                    ? "border-success/50"
                    : "border-primary/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Table {order.tableNumber}</CardTitle>
                    <div className={`flex items-center gap-1 text-sm ${getTimeClass(order.createdAt)}`}>
                      <Clock className="h-4 w-4" />
                      {getElapsedTime(order.createdAt)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-2 rounded-lg bg-secondary/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{item.quantity}×</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors[item.status]}>
                          {item.status}
                        </Badge>
                        {item.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateItemStatus(item.id, "preparing")}
                            disabled={updateItem.isPending}
                          >
                            <ChefHat className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === "preparing" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            onClick={() => updateItemStatus(item.id, "ready")}
                            disabled={updateItem.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {!order.items.every((i) => i.status === "ready") && (
                    <Button
                      variant="default"
                      className="w-full mt-2"
                      onClick={() => markAllReady(order)}
                      disabled={updateItem.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark All Ready
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
