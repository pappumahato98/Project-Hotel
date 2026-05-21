import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Bed, MessageSquare, Award, Star } from "lucide-react";
import { formatAD, formatCurrency } from "@/lib/utils";

const db = supabase as any;

interface GuestHistoryTimelineProps {
  guestId: string;
  guestName: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: "reservation" | "feedback" | "communication" | "loyalty" | "spending";
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function GuestHistoryTimeline({ guestId, guestName }: GuestHistoryTimelineProps) {
  const { data: reservations = [] } = useQuery({
    queryKey: ["guest-reservations", guestId],
    queryFn: async () => {
      const { data, error } = await db
        .from("reservations")
        .select("*, rooms(room_number, room_type)")
        .eq("guest_id", guestId)
        .order("check_in_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!guestId,
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["guest-feedback-history", guestId],
    queryFn: async () => {
      const { data, error } = await db
        .from("guest_feedback")
        .select("*")
        .eq("guest_id", guestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!guestId,
  });

  const { data: communications = [] } = useQuery({
    queryKey: ["guest-comms-history", guestId],
    queryFn: async () => {
      const { data, error } = await db
        .from("guest_communications")
        .select("*")
        .eq("guest_id", guestId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!guestId,
  });

  const timeline = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    reservations.forEach((r: any) => {
      events.push({
        id: `res-${r.id}`,
        date: r.check_in_date,
        type: "reservation",
        title: `Stay in Room ${r.rooms?.room_number || "N/A"}`,
        description: `${r.rooms?.room_type || "Room"} • ${r.status} • ${formatCurrency(r.total_amount || 0)}`,
        icon: <Bed className="h-4 w-4" />,
        color: "bg-primary/20 text-primary border-primary/30",
      });
    });

    feedback.forEach((f: any) => {
      events.push({
        id: `fb-${f.id}`,
        date: f.created_at,
        type: "feedback",
        title: `${f.feedback_type} - ${f.title || "Feedback"}`,
        description: `Rating: ${f.rating || "N/A"} ★ • ${f.status}`,
        icon: <Star className="h-4 w-4" />,
        color: f.feedback_type === "complaint"
          ? "bg-destructive/20 text-destructive border-destructive/30"
          : "bg-success/20 text-success border-success/30",
      });
    });

    communications.forEach((c: any) => {
      events.push({
        id: `comm-${c.id}`,
        date: c.created_at,
        type: "communication",
        title: `${c.channel} ${c.direction}`,
        description: c.subject || c.message?.substring(0, 80) || "",
        icon: <MessageSquare className="h-4 w-4" />,
        color: "bg-secondary text-secondary-foreground border-border",
      });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }, [reservations, feedback, communications]);

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Guest History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No history available</p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            {timeline.map((event, i) => (
              <div key={event.id} className="relative pl-10 pb-6 last:pb-0">
                <div className={`absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center ${event.color} border`}>
                  {event.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatAD(new Date(event.date))}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {event.type}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
