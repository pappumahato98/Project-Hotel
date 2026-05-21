import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ReservationCalendar as CalendarView } from "@/components/reservations/ReservationCalendar";
import { CheckInOutDialog } from "@/components/reservations/CheckInOutDialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function ReservationCalendarPage() {
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);

  return (
    <MainLayout 
      title="Reservation Calendar" 
      subtitle="Visual timeline of all room bookings"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button 
            variant="blue"
            className="gap-2"
            onClick={() => setWalkInDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Walk-in Check-in
          </Button>
        </div>
        
        <CalendarView />

        <CheckInOutDialog
          open={walkInDialogOpen}
          onOpenChange={setWalkInDialogOpen}
          mode="walk-in"
        />
      </div>
    </MainLayout>
  );
}
