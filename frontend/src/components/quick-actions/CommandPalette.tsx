import { useNavigate } from "react-router-dom";
import { useQuickActions } from "@/contexts/QuickActionsContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  CalendarPlus,
  UserPlus,
  BedDouble,
  Wrench,
  Home,
  Calendar,
  Users,
  DoorOpen,
  CreditCard,
  FileText,
  Settings,
  Building2,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";

export function CommandPalette() {
  const navigate = useNavigate();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setNewBookingOpen,
    setNewGuestOpen,
    setNewRoomOpen,
    setNewMaintenanceOpen,
  } = useQuickActions();

  const handleSelect = (callback: () => void) => {
    setCommandPaletteOpen(false);
    callback();
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect(() => setNewBookingOpen(true))}>
            <CalendarPlus className="mr-2 h-4 w-4 text-primary" />
            <span>New Booking</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setNewGuestOpen(true))}>
            <UserPlus className="mr-2 h-4 w-4 text-success" />
            <span>New Guest</span>
            <CommandShortcut>⌘G</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setNewRoomOpen(true))}>
            <BedDouble className="mr-2 h-4 w-4 text-blue-400" />
            <span>New Room</span>
            <CommandShortcut>⌘R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setNewMaintenanceOpen(true))}>
            <Wrench className="mr-2 h-4 w-4 text-orange-400" />
            <span>New Maintenance Request</span>
            <CommandShortcut>⌘M</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => navigate("/"))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
            <CommandShortcut>⌥H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/reservations"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Reservations</span>
            <CommandShortcut>⌥R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/guests"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Guests</span>
            <CommandShortcut>⌥G</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/rooms"))}>
            <DoorOpen className="mr-2 h-4 w-4" />
            <span>Rooms</span>
            <CommandShortcut>⌥O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/payments"))}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Payments</span>
            <CommandShortcut>⌥B</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Modules">
          <CommandItem onSelect={() => handleSelect(() => navigate("/housekeeping"))}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Housekeeping</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/engineering"))}>
            <Wrench className="mr-2 h-4 w-4" />
            <span>Engineering</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/pos"))}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>Point of Sale</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/channels"))}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Channel Manager</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/reports"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌥S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
