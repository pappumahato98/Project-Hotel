import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  CalendarPlus, 
  CreditCard, 
  Wrench,
  BedDouble,
  ClipboardList,
  ShoppingCart,
  FileText,
  Users,
  DoorOpen,
  Building2,
  LogIn
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuickActions } from "@/contexts/QuickActionsContext";
import { motion } from "framer-motion";

export function QuickActions() {
  const navigate = useNavigate();
  const { setNewBookingOpen, setNewGuestOpen, setNewMaintenanceOpen } = useQuickActions();

  const primaryActions = [
    { icon: UserPlus, label: "Add Guest", shortcut: "⌘G", onClick: () => setNewGuestOpen(true) },
    { icon: CalendarPlus, label: "New Booking", shortcut: "⌘N", onClick: () => setNewBookingOpen(true) },
    { icon: CreditCard, label: "Payment", onClick: () => navigate("/payments") },
    { icon: Wrench, label: "Maintenance", shortcut: "⌘M", onClick: () => setNewMaintenanceOpen(true) },
  ];

  const moduleLinks = [
    { icon: BedDouble, label: "Rooms", to: "/rooms" },
    { icon: ClipboardList, label: "Reservations", to: "/reservations" },
    { icon: ShoppingCart, label: "POS", to: "/pos" },
    { icon: FileText, label: "Reports", to: "/reports" },
    { icon: DoorOpen, label: "Housekeeping", to: "/housekeeping" },
    { icon: Users, label: "Staff", to: "/staff" },
    { icon: Building2, label: "Channels", to: "/channels" },
    { icon: LogIn, label: "Walk-in", to: "/calendar" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {primaryActions.map((action) => (
              <Button
                key={action.label}
                variant="secondary"
                className="h-auto py-3.5 flex-col gap-1.5 hover:bg-accent relative group"
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">{action.label}</span>
                {action.shortcut && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.shortcut}
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="pt-3 border-t border-border/60">
            <p className="text-[10px] text-muted-foreground mb-2.5 font-semibold uppercase tracking-wider">Go to Module</p>
            <div className="grid grid-cols-4 gap-1.5">
              {moduleLinks.map((link) => (
                <Button
                  key={link.label}
                  variant="ghost"
                  size="sm"
                  className="h-auto py-2 flex-col gap-1 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate(link.to)}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium">{link.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
