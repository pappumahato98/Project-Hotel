import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Calendar,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  category: "Legal" | "Financial" | "Logistics" | "Catering" | "Venue";
  completed: boolean;
  dueDate: string;
}

interface BanquetEvent {
  id: string;
  event_name: string;
  client_name: string;
  event_date: string;
}

interface EventActionPlanPanelProps {
  events: BanquetEvent[];
}

const defaultTasks: Omit<Task, "id" | "dueDate">[] = [
  { title: "Contract Signing", category: "Legal", completed: false },
  { title: "Initial Deposit Received", category: "Financial", completed: false },
  { title: "Menu Selection Finalized", category: "Catering", completed: false },
  { title: "Venue Walkthrough", category: "Venue", completed: false },
  { title: "Guest List Confirmed", category: "Logistics", completed: false },
  { title: "Final Payment Received", category: "Financial", completed: false },
  { title: "Vendor Coordination Complete", category: "Logistics", completed: false },
  { title: "Floor Plan Approval", category: "Venue", completed: false },
];

export function EventActionPlanPanel({ events }: EventActionPlanPanelProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || "");
  const [eventTasks, setEventTasks] = useState<Record<string, Task[]>>({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-select event if directed from quick setup
  useEffect(() => {
    const setupEventId = searchParams.get("setupEvent");
    const action = searchParams.get("setupAction");
    
    if (setupEventId && action === "view_plan") {
      setSelectedEventId(setupEventId);
      // Clear params after selecting
      setSearchParams(prev => {
        prev.delete("setupEvent");
        prev.delete("setupAction");
        return prev;
      });
    }
  }, [searchParams, events]);

  // Initialize tasks for each event if not already present
  useEffect(() => {
    const newEventTasks = { ...eventTasks };
    let changed = false;

    events.forEach(event => {
      if (!newEventTasks[event.id]) {
        newEventTasks[event.id] = defaultTasks.map(t => ({
          ...t,
          id: Math.random().toString(36).substr(2, 9),
          dueDate: new Date(new Date(event.event_date).getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        }));
        changed = true;
      }
    });

    if (changed) {
      setEventTasks(newEventTasks);
    }
  }, [events]);

  const tasks = eventTasks[selectedEventId] || [];
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    
    setEventTasks({
      ...eventTasks,
      [selectedEventId]: updatedTasks
    });

    const task = updatedTasks.find(t => t.id === taskId);
    if (task?.completed) {
      toast.success(`Milestone reached: ${task.title}`);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Event Action Plan</h2>
          <p className="text-muted-foreground text-sm">
            Track milestones and critical path items for each booking
          </p>
        </div>
        
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.event_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">Overall Completion</p>
                  <h3 className="text-2xl font-bold">{progress.toFixed(0)}%</h3>
                </div>
                <ClipboardCheck className="h-8 w-8 text-primary opacity-50" />
              </div>
              <Progress value={progress} className="h-3 bg-primary/20" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{completedCount} of {tasks.length} tasks completed</span>
                <span>Target: {selectedEvent?.event_date}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  task.completed 
                    ? "bg-success/5 border-success/20 opacity-80" 
                    : "bg-card hover:border-primary/50"
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="flex-shrink-0">
                  {task.completed ? (
                    <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                      <Circle className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </h4>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {task.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Due by: {task.dueDate}
                    </div>
                    {new Date(task.dueDate) < new Date() && !task.completed && (
                      <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                        <AlertCircle className="h-3 w-3" />
                        Overdue
                      </div>
                    )}
                  </div>
                </div>
                
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${task.completed ? "rotate-90" : ""}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Booking Status</span>
                <Badge>Active</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Critical Items</span>
                <span className="font-bold text-destructive">2 Pending</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Next Milestone</span>
                <span className="text-xs font-medium">Guest List Confirmed</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-none">
            <CardHeader>
              <CardTitle className="text-sm">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs border-l-2 border-primary pl-3 py-1">
                <p className="font-medium text-foreground">Menu Selection Finalized</p>
                <p className="text-muted-foreground text-[10px]">Today, 09:15 AM by Admin</p>
              </div>
              <div className="text-xs border-l-2 border-muted pl-3 py-1">
                <p className="font-medium text-muted-foreground">Contract Signing</p>
                <p className="text-muted-foreground text-[10px]">Yesterday, 04:30 PM by Admin</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
