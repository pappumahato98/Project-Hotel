import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Receipt, DollarSign, ArrowRightLeft, Tag, Zap, CreditCard, PlusCircle } from "lucide-react";
import { useGuestFolios } from "@/hooks/useGuestFolios";
import { useReservations } from "@/hooks/useReservations";
import { useRooms } from "@/hooks/useRooms";
import { supabase } from "@/integrations/supabase/client";

interface PMSActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  room?: any;
}

export const PMSActionDialog = ({ open, onOpenChange, type, room }: PMSActionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { addFolioItem, folios } = useGuestFolios();
  const { updateReservation, reservations } = useReservations();
  const { data: allRooms = [] } = useRooms();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [newRate, setNewRate] = useState("");

  // Find active folio for the room
  const activeFolio = folios?.find(f => f.room_id === room?.id && f.status === 'open');
  // Find active reservation for the room
  const activeReservation = reservations?.find(r => r.room_id === room?.id && r.status === 'checked-in');

  useEffect(() => {
    if (open) {
      setAmount("");
      setMethod("cash");
      setNotes("");
      setTargetRoomId("");
      setNewRate("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      switch(type) {
        case 'advance-receipt':
          if (!activeFolio) throw new Error("No active folio found for this room.");
          await addFolioItem.mutateAsync({
            folio_id: activeFolio.id,
            item_type: 'payment',
            source: 'advance_deposit',
            description: `Advance Deposit (${method.toUpperCase()})`,
            amount: -Math.abs(parseFloat(amount)),
            reason: notes
          });
          break;

        case 'quick-charge':
          if (!activeFolio) throw new Error("No active folio found for this room.");
          await addFolioItem.mutateAsync({
            folio_id: activeFolio.id,
            item_type: 'charge',
            source: 'service',
            description: notes || 'Quick Service Charge',
            amount: Math.abs(parseFloat(amount)),
            reason: notes
          });
          break;

        case 'quick-payment':
          if (!activeFolio) throw new Error("No active folio found for this room.");
          await addFolioItem.mutateAsync({
            folio_id: activeFolio.id,
            item_type: 'payment',
            source: 'payment',
            description: `Quick Payment (${method.toUpperCase()})`,
            amount: -Math.abs(parseFloat(amount)),
            reason: notes
          });
          break;

        case 'rate-posting':
          if (!activeFolio) throw new Error("No active folio found for this room.");
          await addFolioItem.mutateAsync({
            folio_id: activeFolio.id,
            item_type: 'charge',
            source: 'room_rate',
            description: `Manual Room Charge - ${new Date().toLocaleDateString()}`,
            amount: room?.price_per_night || 0,
            reason: notes
          });
          break;

        case 'room-move':
          if (!activeReservation) throw new Error("No active reservation found for this room.");
          if (!targetRoomId) throw new Error("Please select a target room.");

          // 1. Update reservation's room_id
          await updateReservation.mutateAsync({
            id: activeReservation.id,
            room_id: targetRoomId
          });

          // 2. Update room statuses
          await supabase.from('rooms').update({ status: 'cleaning' }).eq('id', room.id);
          await supabase.from('rooms').update({ status: 'occupied' }).eq('id', targetRoomId);

          // 3. Update folio's room_id
          if (activeFolio) {
            await supabase.from('guest_folios').update({ room_id: targetRoomId }).eq('id', activeFolio.id);
          }
          break;

        case 'change-rate':
          if (!activeReservation) throw new Error("No active reservation found for this room.");
          await updateReservation.mutateAsync({
            id: activeReservation.id,
            total_amount: activeReservation.total_amount + (parseFloat(newRate) - (room?.price_per_night || 0)) // Simplistic logic
          });
          toast.success(`Rate updated for Reservation ${activeReservation.reservation_code}`);
          break;

        default:
          toast.info(`Logic for ${type} not yet implemented.`);
      }

      toast.success(`${type.replace('-', ' ').toUpperCase()} successful for Room ${room?.room_number}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'advance-receipt': return 'Advance Receipt / Deposit';
      case 'quick-charge': return 'Add Quick Charge';
      case 'quick-payment': return 'Process Quick Payment';
      case 'rate-posting': return 'Manual Room Rate Posting';
      case 'room-move': return 'Room / Pax Change (Move)';
      case 'change-rate': return 'Adjust Room Rate';
      default: return 'PMS Operation';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'advance-receipt': return <Receipt className="h-5 w-5 text-cyan-400" />;
      case 'quick-charge': return <PlusCircle className="h-5 w-5 text-indigo-400" />;
      case 'quick-payment': return <CreditCard className="h-5 w-5 text-emerald-400" />;
      case 'rate-posting': return <DollarSign className="h-5 w-5 text-green-400" />;
      case 'room-move': return <ArrowRightLeft className="h-5 w-5 text-amber-400" />;
      case 'change-rate': return <Tag className="h-5 w-5 text-fuchsia-400" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold tracking-tight">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Room {room?.room_number} - {room?.room_type}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {(type === 'advance-receipt' || type === 'quick-payment') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {type === 'advance-receipt' ? 'Deposit Amount' : 'Payment Amount'}
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    className="bg-secondary/50 border-border pl-9"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference/Notes</Label>
                <Input
                  id="notes"
                  className="bg-secondary/50 border-border"
                  placeholder="e.g. Transaction ID"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'quick-charge' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Charge Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    className="bg-secondary/50 border-border pl-9"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description / Service</Label>
                <Input
                  id="notes"
                  className="bg-secondary/50 border-border"
                  placeholder="e.g. Extra Bed, Mini Bar"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'rate-posting' && (
            <>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border mb-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Standard Daily Rate</p>
                <p className="text-xl font-bold">${room?.price_per_night || '0.00'}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="posting-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Posting Date</Label>
                <Input id="posting-date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-secondary/50 border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Remarks</Label>
                <Textarea
                  id="notes"
                  className="bg-secondary/50 border-border"
                  placeholder="Manual override reason..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'room-move' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-room" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Room</Label>
                <Select value={targetRoomId} onValueChange={setTargetRoomId} required>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="SELECT VACANT ROOM" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {allRooms.filter(r => r.status === 'available' && r.id !== room?.id).map(r => (
                      <SelectItem key={r.id} value={r.id}>Room {r.room_number} - {r.room_type}</SelectItem>
                    ))}
                    {allRooms.filter(r => r.status === 'available' && r.id !== room?.id).length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground">No vacant rooms available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="move-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason for Move</Label>
                <Select defaultValue="request">
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="request">Guest Request</SelectItem>
                    <SelectItem value="maintenance">Maintenance Issue</SelectItem>
                    <SelectItem value="upgrade">Complimentary Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === 'change-rate' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Old Rate</Label>
                  <Input disabled value={`$${room?.price_per_night || '0.00'}`} className="bg-secondary/50 border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-rate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Rate</Label>
                  <Input
                    id="new-rate"
                    type="number"
                    step="0.01"
                    className="bg-secondary/50 border-border"
                    placeholder="0.00"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Authorization Code</Label>
                <Input id="auth-code" type="password" placeholder="MANAGER PIN" className="bg-secondary/50 border-border" />
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:bg-secondary"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold tracking-widest px-8"
            >
              {loading ? "EXECUTING..." : "CONFIRM"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
