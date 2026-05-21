import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, User, Bed, Calendar, CreditCard, Phone, Mail, FileText, Pencil, Printer, Trash2, LogIn, Receipt, PlusCircle, AlertCircle, Clock } from "lucide-react";
import { Reservation, useReservations } from "@/hooks/useReservations";
import { formatAD, formatCurrency, cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { useGuestFolios } from "@/hooks/useGuestFolios";
import { useState } from "react";
import { PMSActionDialog } from "../pms/PMSActionDialog";

const statusColors: Record<string, string> = {
  confirmed: "bg-success/20 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/30",
  "checked-in": "bg-primary/20 text-primary border-primary/30",
  "checked-out": "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
  "no-show": "bg-destructive/20 text-destructive border-destructive/30",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  partial: "bg-primary/20 text-primary border-primary/30",
  paid: "bg-success/20 text-success border-success/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

interface Props {
  reservation: Reservation;
  onClose: () => void;
  onEdit?: () => void;
  onCheckIn?: () => void;
  onCancel?: () => void;
}

export function ReservationDetailPanel({ reservation, onClose, onEdit, onCheckIn, onCancel }: Props) {
  const navigate = useNavigate();
  const { cancelReservation } = useReservations();
  const { folios, useFolioItems } = useGuestFolios();
  const [isQuickChargeOpen, setIsQuickChargeOpen] = useState(false);

  // Find active folio
  const activeFolio = folios?.find(f => f.reservation_id === reservation.id);
  const { data: folioItems = [] } = useFolioItems(activeFolio?.id || "");

  const nights = differenceInDays(parseISO(reservation.check_out_date), parseISO(reservation.check_in_date));

  const handleCancel = async () => {
    if (window.confirm("Are you sure you want to cancel this reservation?")) {
      try {
        await cancelReservation.mutateAsync(reservation.id);
        if (onCancel) onCancel();
        onClose();
      } catch (error) {
        console.error("Error cancelling reservation:", error);
      }
    }
  };

  return (
    <Card variant="elevated" className="sticky top-4">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Reservation Details</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* First Section: ID, Status, Source, Primary Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-lg font-bold text-primary">{reservation.reservation_code}</p>
            <div className="flex gap-2">
              <Badge variant="outline" className={statusColors[reservation.status] || statusColors.pending}>
                {reservation.status}
              </Badge>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            Booking Source: <span className="text-foreground">{reservation.source || "Direct"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {reservation.status === "confirmed" || reservation.status === "pending" ? (
              <Button size="sm" variant="blue" className="gap-2" onClick={onCheckIn}>
                <LogIn className="h-4 w-4" /> Check-in
              </Button>
            ) : null}
            {reservation.status !== "cancelled" && reservation.status !== "checked-out" && (
              <Button size="sm" variant="destructive" className="gap-2" onClick={handleCancel} disabled={cancelReservation.isPending}>
                <Trash2 className="h-4 w-4" /> Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/front-desk?reservationId=${reservation.id}`)}>
              <FileText className="h-4 w-4" /> View Folio
            </Button>
          </div>
        </div>

        <Separator />

        {/* Second Section: Guest, Room, Dates, Duration, Counts */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Who booking for</p>
              <p className="font-bold text-sm">
                {reservation.guest ? `${reservation.guest.first_name} ${reservation.guest.last_name}` : "Unknown"}
              </p>
              {reservation.guest?.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Phone className="h-3 w-3" /> {reservation.guest.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Bed className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">
                {reservation.room ? `Room ${reservation.room.room_number}` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">{reservation.room?.room_type} • {formatCurrency(reservation.room?.price_per_night || 0)}/night</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm">
                {formatAD(reservation.check_in_date)} → {formatAD(reservation.check_out_date)}
                <span className="ml-1.5 font-medium text-primary">({nights} {nights === 1 ? "night" : "nights"})</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-bold">
                {reservation.adults || 0} Adult(s), {reservation.children || 0} Child(ren)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Third Section: Live Financial Snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold uppercase tracking-wider text-[10px]">Financial Snapshot</span>
            </div>
            {activeFolio && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 font-bold"
                onClick={() => setIsQuickChargeOpen(true)}
              >
                <PlusCircle className="h-3 w-3" /> QUICK CHARGE
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
              <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Room Total</p>
              <p className="text-sm font-black">{formatCurrency(reservation.total_amount)}</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
              <p className="text-[9px] text-muted-foreground font-bold uppercase mb-1">Folio Balance</p>
              <p className={cn(
                "text-sm font-black",
                (activeFolio?.balance || 0) > 0 ? "text-destructive" : "text-emerald-400"
              )}>
                {activeFolio ? formatCurrency(activeFolio.balance) : "No Folio"}
              </p>
            </div>
          </div>

          {folioItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent Transactions
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                {folioItems.slice(-3).reverse().map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-[11px] p-2 bg-secondary/20 rounded border border-border/30">
                    <span className="truncate max-w-[140px] text-zinc-300">{item.description}</span>
                    <span className={cn("font-bold", item.amount > 0 ? "text-amber-400" : "text-emerald-400")}>
                      {formatCurrency(Math.abs(item.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!activeFolio && reservation.status === 'checked-in' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] text-amber-500 font-bold uppercase">Attention: Missing Folio</p>
            </div>
          )}
        </div>

        {reservation.special_requests && (
          <>
            <Separator />
            <div>
              <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Special Requests</p>
              <p className="text-xs bg-secondary/30 p-2 rounded border border-border/50 italic text-zinc-400">
                {reservation.special_requests}
              </p>
            </div>
          </>
        )}

        <PMSActionDialog
          open={isQuickChargeOpen}
          onOpenChange={setIsQuickChargeOpen}
          type="quick-charge"
          room={reservation.room ? { ...reservation.room, id: reservation.room_id } : null}
        />
      </CardContent>
    </Card>
  );
}
