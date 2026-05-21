import { useState, useMemo, DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Users,
  MapPin,
  GripVertical,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface BanquetEvent {
  id: string;
  event_name: string;
  event_type: string;
  client_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  guest_count: number;
  status: "inquiry" | "confirmed" | "in_progress" | "completed" | "cancelled";
  total_amount: number;
}

interface DraggableBanquetCalendarProps {
  events: BanquetEvent[];
  onEventClick?: (event: BanquetEvent) => void;
  onDateClick?: (date: string) => void;
  onEventDrop?: (eventId: string, newDate: string) => Promise<void>;
}

const eventTypeColors: Record<string, string> = {
  wedding: "bg-pink-500",
  corporate: "bg-blue-500",
  birthday: "bg-purple-500",
  conference: "bg-amber-500",
  social: "bg-green-500",
  other: "bg-muted-foreground",
};

const statusColors: Record<string, string> = {
  inquiry: "border-l-amber-400",
  confirmed: "border-l-success",
  in_progress: "border-l-primary",
  completed: "border-l-muted-foreground",
  cancelled: "border-l-destructive",
};

export function DraggableBanquetCalendar({
  events,
  onEventClick,
  onDateClick,
  onEventDrop,
}: DraggableBanquetCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedEvent, setDraggedEvent] = useState<BanquetEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, BanquetEvent[]>();
    events.forEach((event) => {
      const dateStr = event.event_date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(event);
    });
    return map;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [startingDayOfWeek, daysInMonth]);

  const formatDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Drag handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, event: BanquetEvent) => {
    e.dataTransfer.setData("text/plain", event.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEvent(event);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);

    if (draggedEvent && onEventDrop && draggedEvent.event_date !== dateStr) {
      try {
        await onEventDrop(draggedEvent.id, dateStr);
        toast.success(`Event "${draggedEvent.event_name}" rescheduled to ${dateStr}`);
      } catch (error) {
        toast.error("Failed to reschedule event");
      }
    }

    setDraggedEvent(null);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {monthNames[month]} {year}
            <Badge variant="outline" className="ml-2 text-xs">
              Drag to reschedule
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-28 bg-muted/20 rounded-lg" />;
            }

            const dateStr = formatDateString(day);
            const dayEvents = eventsByDate.get(dateStr) || [];
            const today = isToday(day);
            const isDragOver = dragOverDate === dateStr;

            return (
              <div
                key={day}
                className={`h-28 p-1 rounded-lg border transition-all cursor-pointer ${
                  today ? "border-primary bg-primary/5" : "border-border"
                } ${isDragOver ? "border-2 border-dashed border-primary bg-primary/10" : ""} hover:bg-secondary/50`}
                onClick={() => onDateClick?.(dateStr)}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className={`text-sm font-medium mb-1 ${today ? "text-primary" : ""}`}>
                  {day}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <TooltipProvider>
                    {dayEvents.slice(0, 2).map((event) => (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            className={`text-xs p-1 rounded truncate border-l-2 bg-secondary/50 cursor-grab active:cursor-grabbing hover:bg-secondary group ${
                              statusColors[event.status]
                            } ${draggedEvent?.id === event.id ? "opacity-50" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  eventTypeColors[event.event_type] || eventTypeColors.other
                                }`}
                              />
                              <span className="truncate">{event.event_name}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold">{event.event_name}</p>
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.start_time} - {event.end_time}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.venue}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.guest_count} guests
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {event.status.replace("_", " ")}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Drag to reschedule
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">Event Types:</span>
              {Object.entries(eventTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
