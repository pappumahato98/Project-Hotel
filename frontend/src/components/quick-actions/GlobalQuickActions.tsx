import { useQuickActions } from "@/contexts/QuickActionsContext";
import { useQueryClient } from "@tanstack/react-query";
import { NewGuestDialog } from "./NewGuestDialog";
import { NewRoomDialog } from "./NewRoomDialog";
import { NewMaintenanceDialog } from "./NewMaintenanceDialog";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";

export function GlobalQuickActions() {
  const queryClient = useQueryClient();
  const {
    newBookingOpen,
    setNewBookingOpen,
    newGuestOpen,
    setNewGuestOpen,
    newRoomOpen,
    setNewRoomOpen,
    newMaintenanceOpen,
    setNewMaintenanceOpen,
    shortcutsHelpOpen,
    setShortcutsHelpOpen,
  } = useQuickActions();

  return (
    <>
      <CommandPalette />
      
      <KeyboardShortcutsModal 
        open={shortcutsHelpOpen} 
        onOpenChange={setShortcutsHelpOpen} 
      />
      
      <NewReservationDialog
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
        }}
      />

      <NewGuestDialog
        open={newGuestOpen}
        onOpenChange={setNewGuestOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["guests"] });
        }}
      />

      <NewRoomDialog
        open={newRoomOpen}
        onOpenChange={setNewRoomOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        }}
      />

      <NewMaintenanceDialog
        open={newMaintenanceOpen}
        onOpenChange={setNewMaintenanceOpen}
      />
    </>
  );
}
