import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, Edit, Trash2, Receipt, Mail, Phone, MapPin, FileText, Clock, Award, Wallet } from "lucide-react";
import { formatCurrency, formatAD } from "@/lib/utils";
import type { Guest } from "@/hooks/useGuests";
import { useGuestCRUD } from "@/hooks/useGuestCRUD";
import { useInvoices } from "@/hooks/useBillingData";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GuestProfilePanelProps {
  guest: Guest;
  onEdit: () => void;
  onViewDocuments: () => void;
  onViewHistory: () => void;
  onClose: () => void;
}

export function GuestProfilePanel({ guest, onEdit, onViewDocuments, onViewHistory, onClose }: GuestProfilePanelProps) {
  const navigate = useNavigate();
  const { deleteGuest, toggleVIP } = useGuestCRUD();
  const { data: invoices = [] } = useInvoices();

  const previousDue = invoices
    .filter(inv => inv.guest_id === guest.id && inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  const handleDelete = async () => {
    await deleteGuest.mutateAsync(guest.id);
    onClose();
  };

  return (
    <Card variant="elevated" className="sticky top-4">
      <CardHeader className="text-center pb-2">
        <Avatar className="h-16 w-16 mx-auto mb-2">
          <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xl font-bold">
            {guest.first_name[0]}{guest.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          {guest.first_name} {guest.last_name}
          {guest.is_vip && <Star className="h-4 w-4 text-primary fill-primary" />}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Member since {formatAD(new Date(guest.created_at))}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          {guest.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{guest.email}</span>
            </div>
          )}
          {guest.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{guest.phone}</span>
            </div>
          )}
          {(guest as any).country && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{[(guest as any).city, (guest as any).country].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Visits</p>
            <p className="text-lg font-bold">{guest.total_visits || 0}</p>
          </div>
          <div className="text-center p-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(guest.total_spending || 0)}</p>
          </div>
        </div>

        {previousDue > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Wallet className="h-4 w-4 text-destructive" />
               <span className="text-xs font-bold text-destructive uppercase tracking-tighter">Previous Due</span>
            </div>
            <span className="font-mono font-bold text-destructive">{formatCurrency(previousDue)}</span>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={onEdit}>
            <Edit className="h-4 w-4" /> Edit Profile
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate(`/front-desk?guestId=${guest.id}`)}>
            <Receipt className="h-4 w-4" /> View Folio
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={onViewDocuments}>
            <FileText className="h-4 w-4" /> Documents
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={onViewHistory}>
            <Clock className="h-4 w-4" /> History
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => toggleVIP.mutateAsync({ id: guest.id, is_vip: !guest.is_vip })}
          >
            <Award className="h-4 w-4" />
            {guest.is_vip ? "Remove VIP" : "Mark VIP"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete Guest
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Guest?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {guest.first_name} {guest.last_name}'s profile. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
