import React, { useState, useMemo, useRef, useEffect } from "react";
import { usePOSTerminal } from "@/hooks/pos/usePOSTerminal";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Banknote,
  Home,
  Gift,
  Trash2,
  Plus,
  CheckCircle2,
  User,
  Receipt,
  ArrowLeft,
  X,
  Palette,
  Calculator,
  ShieldCheck,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BillingSettlementProps {
  orderId: string;
  tableId: string;
  onComplete: () => void;
}

export const BillingSettlement: React.FC<BillingSettlementProps> = ({ orderId, tableId, onComplete }) => {
  const { activeOrders, settleBill, toggleTaxExempt, calculateGratuity } = usePOSTerminal();
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [splitMode, setSplitMode] = useState<"full" | "seat" | "item" | "amount">("full");
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const order = activeOrders.find(o => o.id === orderId);

  const totals = useMemo(() => {
    if (!order?.pos_order_items) return { subtotal: 0, tax: 0, tip: 0, total: 0 };

    let items = order.pos_order_items;
    if (splitMode === "seat" && selectedSeat) {
      items = order.pos_order_items.filter((i: any) => i.seat_number === selectedSeat);
    }

    const subtotal = items.reduce((acc: number, i: any) => acc + (i.item_price * i.quantity), 0);
    const taxRate = order.is_tax_exempt ? 0 : 0.1;
    const tax = subtotal * taxRate;
    const tipRate = calculateGratuity(order);
    const tip = subtotal * tipRate;

    let finalTotal = subtotal + tax + tip;
    if (splitMode === "amount") {
      finalTotal = finalTotal / splitCount;
    }

    return { subtotal, tax, tip, total: finalTotal, taxRate, tipRate };
  }, [order, splitMode, selectedSeat, splitCount, calculateGratuity]);

  // --- Canvas Signature Logic ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.moveTo(x, y);
    (canvas as any).isDrawing = true;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !(canvas as any).isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    (canvas as any).isDrawing = false;
    setSignatureData(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSettle = async () => {
    if (paymentMethod === "room" && order.reservation?.status === "checked-out") {
      toast.error("Strict Block: Guest has already checked out.");
      return;
    }

    const isFinal = splitMode === "full"; // Simplified for this logic

    await settleBill.mutateAsync({
      orderId,
      tableId,
      paymentMethod,
      subtotal: totals.subtotal,
      tax: totals.tax,
      serviceCharge: totals.tip,
      amountPaid: totals.total,
      isFinalPayment: isFinal,
      signatureUrl: signatureData || undefined,
      roomNumber: order?.reservation?.rooms?.room_number
    });

    if (isFinal) {
      onComplete();
    } else {
      toast.success("Partial payment accepted. Balance updated.");
    }
  };

  if (!order) return null;

  return (
    <div className="flex h-full gap-6 overflow-hidden">

      {/* Settlement Left Pane: Payment Options */}
      <div className="w-1/3 flex flex-col gap-4">
        <Card className="flex-1 overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Settlement Method
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "cash", label: "Cash", icon: Banknote, color: "text-green-500" },
                { id: "card", label: "Debit/Credit", icon: CreditCard, color: "text-blue-500" },
                { id: "room", label: "Room Charge", icon: Home, color: "text-orange-500" },
                { id: "loyalty", label: "Loyalty/Voucher", icon: Gift, color: "text-purple-500" }
              ].map(m => (
                <Button
                  key={m.id}
                  variant={paymentMethod === m.id ? "default" : "outline"}
                  className={cn(
                    "flex flex-col h-24 gap-2 transition-all hover:shadow-lg",
                    paymentMethod === m.id ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
                  )}
                  onClick={() => setPaymentMethod(m.id)}
                >
                  <m.icon className={cn("h-6 w-6", paymentMethod !== m.id && m.color)} />
                  <span className="text-xs font-bold uppercase tracking-widest">{m.label}</span>
                </Button>
              ))}
            </div>

            {paymentMethod === "room" && (
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-orange-500 text-white shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-900">Room #{order.reservation?.rooms?.room_number || "301"}</p>
                    <p className="text-[10px] uppercase font-bold text-orange-600">Credit Status: AUTH_OK</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-4">
                   <div className="space-y-1">
                     <p className="text-[10px] text-orange-700 font-medium">Guest: {order.guest?.first_name} {order.guest?.last_name}</p>
                     <Badge className="bg-orange-600 border-none text-[9px] h-4">MAX CREDIT: $5,000</Badge>
                   </div>
                   <CheckCircle2 className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            )}
          </CardContent>

          <div className="mt-auto p-4 border-t bg-muted/5">
             <div className="p-3 border-2 border-dashed rounded-lg space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  Digital Signature Required
                </p>
                <div className="relative bg-background rounded border h-32 overflow-hidden shadow-inner group">
                   <canvas
                    ref={canvasRef}
                    width={350}
                    height={128}
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                   />
                   <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={clearSignature}
                   >
                     <X className="h-3 w-3" />
                   </Button>
                </div>
             </div>
          </div>
        </Card>
      </div>

      {/* Settlement Right Pane: Check Breakdown & Totals */}
      <Card className="flex-1 flex flex-col overflow-hidden shadow-2xl border-primary/10">
        <CardHeader className="shrink-0 border-b pb-4 flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-black">Final Check</CardTitle>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Invoice #{Date.now()}</p>
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
                  order.is_tax_exempt ? "bg-blue-500 text-white border-blue-600" : "bg-muted text-muted-foreground"
                )}
                onClick={() => toggleTaxExempt.mutate({ orderId, isTaxExempt: !order.is_tax_exempt })}
              >
                <ShieldCheck className="h-3 w-3" />
                {order.is_tax_exempt ? "TAX EXEMPT" : "TAXABLE"}
              </div>
            </div>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg border">
            {["full", "seat", "amount"].map(m => (
              <Button
                key={m}
                variant={splitMode === m ? "default" : "ghost"}
                size="sm"
                className="text-[10px] h-7 px-3 uppercase font-bold"
                onClick={() => setSplitMode(m as any)}
              >
                {m}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden relative">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-6">
               {splitMode === "seat" && (
                 <div className="flex gap-2 overflow-x-auto pb-2">
                    {[1, 2, 3, 4].map(s => (
                      <Button
                        key={s}
                        variant={selectedSeat === s ? "default" : "outline"}
                        className="h-10 px-6 font-bold shrink-0"
                        onClick={() => setSelectedSeat(s)}
                      >
                        Seat {s}
                      </Button>
                    ))}
                 </div>
               )}

               {splitMode === "amount" && (
                 <div className="p-4 bg-primary/5 border rounded-xl space-y-3">
                   <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                     <Calculator className="h-4 w-4" /> Split by Amount
                   </p>
                   <div className="flex items-center gap-4">
                     <span className="text-sm font-medium">Split across:</span>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setSplitCount(Math.max(2, splitCount - 1))}>
                          <X className="h-3 w-3 rotate-45" />
                        </Button>
                        <span className="text-lg font-black w-8 text-center">{splitCount}</span>
                        <Button variant="outline" size="icon" onClick={() => setSplitCount(splitCount + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                     </div>
                     <span className="text-xs text-muted-foreground">ways</span>
                   </div>
                   <p className="text-[10px] text-muted-foreground italic">
                     * Each person pays an equal portion of the total balance.
                   </p>
                 </div>
               )}

               <div className="space-y-4">
                 {(splitMode === "seat" && selectedSeat ?
                    order.pos_order_items.filter((i: any) => i.seat_number === selectedSeat) :
                    order.pos_order_items).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start border-b border-muted/50 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-foreground">{item.item_name}</span>
                           <span className="text-[10px] font-bold text-muted-foreground">x{item.quantity}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          Seat {item.seat_number} • {item.category}
                        </p>
                      </div>
                      <span className="text-sm font-black text-foreground">${(item.item_price * item.quantity).toFixed(2)}</span>
                    </div>
                 ))}
               </div>

               <div className="pt-8 space-y-4 border-t-2 border-dashed">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Subtotal</span>
                    <span className="font-bold">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                      Tax ({Math.round(totals.taxRate * 100)}%)
                    </span>
                    <span className={cn("font-bold", order.is_tax_exempt && "text-blue-600 line-through")}>
                      ${totals.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                      Gratuity ({Math.round(totals.tipRate * 100)}%)
                    </span>
                    <span className="font-bold">${totals.tip.toFixed(2)}</span>
                  </div>
                  {order.reservation?.meal_plan && order.reservation.meal_plan !== 'Room Only' && (
                    <div className="flex justify-between text-sm p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-green-700 font-bold uppercase tracking-widest text-[10px]">Package Deduction</span>
                      <span className="font-bold text-green-700">-${(totals.subtotal * 0.5).toFixed(2)}</span>
                    </div>
                  )}
               </div>
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex-col gap-4 border-t-2 p-6 bg-muted/20 shrink-0">
          <div className="w-full flex justify-between items-center bg-background p-6 rounded-2xl border shadow-lg ring-2 ring-primary/5">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                  {splitMode === "amount" ? `Partial Total (1/${splitCount})` : "Grand Total Due"}
                </p>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black text-foreground">${totals.total.toFixed(2)}</span>
                   <span className="text-xs font-bold text-muted-foreground">USD</span>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Method</p>
                <Badge variant="outline" className="h-8 px-4 font-black text-primary bg-primary/5 uppercase">
                  {paymentMethod}
                </Badge>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              variant="outline"
              className="h-16 text-lg font-bold gap-2 hover:bg-muted"
              onClick={onComplete}
            >
              <ArrowLeft className="h-5 w-5" />
              BACK
            </Button>
            <Button
              className="h-16 text-xl font-black gap-2 shadow-xl shadow-primary/20"
              onClick={handleSettle}
              disabled={settleBill.isPending}
            >
              <Receipt className="h-6 w-6" />
              COMPLETE SETTLEMENT
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
