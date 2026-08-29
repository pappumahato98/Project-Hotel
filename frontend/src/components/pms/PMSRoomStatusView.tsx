import React, { useState, useMemo } from "react";
import { PMSOperationsSidebar } from "./PMSOperationsSidebar";
import { useRooms } from "@/hooks/useRooms";
import { useReservations } from "@/hooks/useReservations";
import { format } from "date-fns";
import { PMSActionDialog } from "./PMSActionDialog";
import { usePMSRealtime } from "@/hooks/usePMSRealtime";
import { useQueryClient } from "@tanstack/react-query";
import { CheckInOutDialog } from "../reservations/CheckInOutDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { StatusGridView } from "./views/StatusGridView";
import { AvailabilityGridView } from "./views/AvailabilityGridView";
import { ReservationManagerView } from "./views/ReservationManagerView";
import { FinancialOperationsView } from "./views/FinancialOperationsView";
import { useGuestFolios } from "@/hooks/useGuestFolios";

// Placeholder views for next steps
const PlaceholderView = ({ title }: { title: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background border-l border-border">
    <div className="p-8 rounded-full bg-cyan-500/10 border border-cyan-500/20">
      <div className="h-12 w-12 text-cyan-500 font-bold text-2xl flex items-center justify-center">?</div>
    </div>
    <h2 className="text-xl font-bold tracking-tight">{title} View</h2>
    <p className="text-muted-foreground text-sm max-w-md text-center">
      This module is being initialized as a dedicated page for hotel operations.
    </p>
  </div>
);

interface PMSRoomStatusViewProps {
  onTabChange?: (tab: string) => void;
}

export const PMSRoomStatusView = ({ onTabChange }: PMSRoomStatusViewProps) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rooms = [], isLoading: roomsLoading, refetch: refetchRooms } = useRooms();
  const { reservations = [], isLoading: resLoading, refetch: refetchRes } = useReservations();
  const { folios } = useGuestFolios();

  // Enable Real-time synchronization
  usePMSRealtime({
    onRoomUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
      refetchRooms();
    },
    onReservationUpdate: () => {
      // Comprehensive invalidation for all reservation-related queries
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
      // Invalidate Night Audit query keys
      queryClient.invalidateQueries({ queryKey: ["reservations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reservations", "stayovers"] });
      // Invalidate report stats
      queryClient.invalidateQueries({ queryKey: ["report-stats"] });
      refetchRes();
    }
  });

  const [activeModule, setActiveModule] = useState("room-status");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [checkInOutOpen, setCheckInOutOpen] = useState(false);
  const [checkInOutMode, setCheckInOutMode] = useState<"walk-in" | "check-in" | "check-out">("walk-in");

  const isLoading = roomsLoading || resLoading;

  // Map reservations to rooms for occupied/arrival status
  const roomOccupancy = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const map: Record<string, { guestName: string; checkoutDate: string; keyIssued: boolean; arrivalToday: boolean; balance?: number }> = {};

    reservations.forEach(res => {
      if (res.status === 'checked-in' && res.room_id) {
        const folio = (folios || []).find((f: any) => f.reservation_id === res.id);
        map[res.room_id] = {
          guestName: `${res.guest?.first_name} ${res.guest?.last_name}`,
          checkoutDate: res.check_out_date,
          keyIssued: true,
          arrivalToday: false,
          balance: folio?.balance
        };
      } else if (res.status === 'confirmed' && res.check_in_date === today && res.room_id) {
        if (!map[res.room_id]) {
          map[res.room_id] = {
            guestName: "",
            checkoutDate: "",
            keyIssued: false,
            arrivalToday: true
          };
        }
      }
    });
    return map;
  }, [reservations, folios]);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchRooms(),
        refetchRes(),
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations"] }),
        queryClient.invalidateQueries({ queryKey: ["guest_folios"] })
      ]);
      toast.success("PMS Core Resynchronized");
    } catch (err) {
      toast.error("Resynchronization Failed");
    }
  };

  const handleAction = (action: string, room: any) => {
    setSelectedRoom(room);

    switch(action) {
      case 'checkin':
        setCheckInOutMode('walk-in');
        setCheckInOutOpen(true);
        break;
      case 'checkout':
        const resForCheckout = reservations.find(r => r.room_id === room.id && r.status === 'checked-in');
        if (resForCheckout) {
          setCheckInOutMode('check-out');
          setCheckInOutOpen(true);
        } else {
          toast.error("No active check-in found for this room.");
        }
        break;
      case 'advance-receipt':
      case 'rate-posting':
      case 'room-move':
      case 'change-rate':
      case 'move':
      case 'add-charge':
      case 'quick-payment':
        setActionType(action === 'move' ? 'room-move' : (action === 'add-charge' ? 'quick-charge' : action));
        setActionDialogOpen(true);
        break;
      case 'folio':
        onTabChange?.('folios');
        if (room.id) {
          setSearchParams({ room: room.room_number });
        }
        break;
      case 'set_available':
        updateRoomStatus(room.id, 'available');
        break;
      case 'set_dirty':
        updateRoomStatus(room.id, 'dirty');
        break;
      case 'set_maintenance':
        updateRoomStatus(room.id, 'maintenance');
        break;
      case 'set_blocked':
        updateRoomStatus(room.id, 'blocked');
        break;
      default:
        console.log(`Action: ${action} on Room ${room.room_number}`);
        break;
    }
  };

  const updateRoomStatus = async (roomId: string, status: string) => {
    try {
      const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
      if (error) throw error;
      toast.success(`Room status updated to ${status}`);
      refetchRooms();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleModuleChange = (moduleId: string) => {
    // Modules that switch tabs entirely
    if (moduleId === 'guest-folios') {
      onTabChange?.('folios');
      return;
    }
    if (moduleId === 'reports') {
      onTabChange?.('reports');
      return;
    }

    // Modules that open specific dialogs but stay on grid (for now, will refactor to views)
    if (moduleId === 'check-in') {
      setCheckInOutMode('walk-in');
      setCheckInOutOpen(true);
      return;
    }

    // Modules that switch the view in the main area
    setActiveModule(moduleId);
  };

  const renderActiveView = () => {
    switch(activeModule) {
      case 'room-status':
        return (
          <StatusGridView
            rooms={rooms}
            roomOccupancy={roomOccupancy}
            isLoading={isLoading}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleRefresh={handleRefresh}
            handleAction={handleAction}
          />
        );
      case 'availability-grid':
        return (
          <AvailabilityGridView
            rooms={rooms}
            reservations={reservations}
            isLoading={isLoading}
          />
        );
      case 'reservation':
        return (
          <ReservationManagerView
            reservations={reservations}
            isLoading={isLoading}
          />
        );
      case 'advance-receipt':
        return <FinancialOperationsView type="advance-receipt" />;
      case 'rate-posting':
        return <FinancialOperationsView type="rate-posting" />;
      case 'adjustment':
        return <FinancialOperationsView type="adjustment" />;
      case 'additional-rate':
        return <PlaceholderView title="Additional Rates" />;
      case 'change-rate':
        return <PlaceholderView title="Rate Changes" />;
      case 'room-move':
        return <PlaceholderView title="Room Move Log" />;
      default:
        return <PlaceholderView title={activeModule.toUpperCase()} />;
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden border-border">
      <CheckInOutDialog
        open={checkInOutOpen}
        onOpenChange={setCheckInOutOpen}
        mode={checkInOutMode}
        reservationId={reservations.find(r => r.room_id === selectedRoom?.id && (r.status === 'checked-in' || r.status === 'confirmed'))?.id}
        onSuccess={() => {
          refetchRooms();
          refetchRes();
        }}
      />
      <PMSActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        type={actionType}
        room={selectedRoom}
      />

      {/* Sidebar */}
      <PMSOperationsSidebar
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
      />

      {/* Main Content Area */}
      {renderActiveView()}
    </div>
  );
};
