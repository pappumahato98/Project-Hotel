 import React, { useState, useEffect } from "react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import {
   Clock,
   LogIn,
   LogOut,
   User,
   Timer,
   CalendarDays,
   Coffee,
 } from "lucide-react";
 import { toast } from "sonner";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { format, differenceInMinutes, differenceInHours, startOfDay, endOfDay } from "date-fns";
 
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const db = supabase as any;
 
interface TimeEntry {
   id: string;
   staff_id: string;
   clock_in: string;
   clock_out: string | null;
   break_minutes: number;
   notes: string | null;
   created_at: string;
 }
 
 interface StaffClockPanelProps {
   onClose?: () => void;
 }
 
 export function StaffClockPanel({ onClose }: StaffClockPanelProps) {
   const { user, profile } = useAuth();
   const queryClient = useQueryClient();
   const [clockDialogOpen, setClockDialogOpen] = useState(false);
   const [notes, setNotes] = useState("");
   const [breakMinutes, setBreakMinutes] = useState(0);
   const [currentTime, setCurrentTime] = useState(new Date());
 
   // Update current time every second
   useEffect(() => {
     const timer = setInterval(() => setCurrentTime(new Date()), 1000);
     return () => clearInterval(timer);
   }, []);
 
   // Fetch today's time entries
   const { data: timeEntries = [], isLoading } = useQuery({
     queryKey: ["staff-time-clock", user?.id],
     queryFn: async () => {
       if (!user) return [];
       const today = new Date();
       const { data, error } = await db
         .from("staff_time_clock")
         .select("*")
         .eq("staff_id", user.id)
         .gte("clock_in", startOfDay(today).toISOString())
         .lte("clock_in", endOfDay(today).toISOString())
         .order("clock_in", { ascending: false });
 
       if (error) throw error;
       return data as TimeEntry[];
     },
     enabled: !!user,
   });
 
   // Check if user is currently clocked in
   const activeEntry = timeEntries.find((e) => e.clock_out === null);
   const isClockedIn = !!activeEntry;
 
   // Calculate total hours worked today
   const totalMinutesToday = timeEntries.reduce((total, entry) => {
     const clockIn = new Date(entry.clock_in);
     const clockOut = entry.clock_out ? new Date(entry.clock_out) : currentTime;
     const worked = differenceInMinutes(clockOut, clockIn) - (entry.break_minutes || 0);
     return total + Math.max(0, worked);
   }, 0);
 
   const hoursWorked = Math.floor(totalMinutesToday / 60);
   const minutesWorked = totalMinutesToday % 60;
 
   // Clock in mutation
   const clockIn = useMutation({
     mutationFn: async () => {
       if (!user) throw new Error("Not authenticated");
       const { data, error } = await db
         .from("staff_time_clock")
         .insert({
           staff_id: user.id,
           clock_in: new Date().toISOString(),
           notes: notes || null,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["staff-time-clock"] });
       toast.success("Clocked in successfully");
       setNotes("");
       setClockDialogOpen(false);
     },
     onError: (error) => {
       toast.error("Failed to clock in: " + error.message);
     },
   });
 
   // Clock out mutation
   const clockOut = useMutation({
     mutationFn: async () => {
       if (!activeEntry) throw new Error("No active clock-in found");
       const { error } = await db
         .from("staff_time_clock")
         .update({
           clock_out: new Date().toISOString(),
           break_minutes: breakMinutes,
           notes: notes || activeEntry.notes,
         })
         .eq("id", activeEntry.id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["staff-time-clock"] });
       toast.success("Clocked out successfully");
       setNotes("");
       setBreakMinutes(0);
       setClockDialogOpen(false);
     },
     onError: (error) => {
       toast.error("Failed to clock out: " + error.message);
     },
   });
 
   const handleClockAction = () => {
     if (isClockedIn) {
       clockOut.mutate();
     } else {
       clockIn.mutate();
     }
   };
 
   const getElapsedTime = (clockInTime: string) => {
     const diff = differenceInMinutes(currentTime, new Date(clockInTime));
     const hours = Math.floor(diff / 60);
     const minutes = diff % 60;
     return `${hours}h ${minutes}m`;
   };
 
   return (
     <div className="space-y-6">
       {/* Current Status Card */}
       <Card variant="elevated">
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <Clock className="h-5 w-5" />
                 Staff Time Clock
               </CardTitle>
               <CardDescription>
                 {profile?.first_name ? `Welcome, ${profile.first_name}` : "Track your work hours"}
               </CardDescription>
             </div>
             <div className="text-right">
               <p className="text-2xl font-mono font-bold">
                 {format(currentTime, "HH:mm:ss")}
               </p>
               <p className="text-sm text-muted-foreground">
                 {format(currentTime, "EEEE, MMM d")}
               </p>
             </div>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Status Display */}
           <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
             <div className="flex items-center gap-3">
               <div
                 className={`h-3 w-3 rounded-full ${
                   isClockedIn ? "bg-success animate-pulse" : "bg-muted-foreground"
                 }`}
               />
               <div>
                 <p className="font-medium">
                   {isClockedIn ? "Currently Clocked In" : "Not Clocked In"}
                 </p>
                 {isClockedIn && activeEntry && (
                   <p className="text-sm text-muted-foreground">
                     Since {format(new Date(activeEntry.clock_in), "h:mm a")} •{" "}
                     {getElapsedTime(activeEntry.clock_in)}
                   </p>
                 )}
               </div>
             </div>
             <Button
               variant={isClockedIn ? "destructive" : "default"}
               size="lg"
               className="gap-2"
               onClick={() => setClockDialogOpen(true)}
             >
               {isClockedIn ? (
                 <>
                   <LogOut className="h-5 w-5" />
                   Clock Out
                 </>
               ) : (
                 <>
                   <LogIn className="h-5 w-5" />
                   Clock In
                 </>
               )}
             </Button>
           </div>
 
           {/* Today's Summary */}
           <div className="grid grid-cols-3 gap-4">
             <div className="text-center p-3 rounded-lg bg-primary/10">
               <Timer className="h-5 w-5 mx-auto mb-1 text-primary" />
               <p className="text-2xl font-bold text-primary">
                 {hoursWorked}h {minutesWorked}m
               </p>
               <p className="text-xs text-muted-foreground">Hours Today</p>
             </div>
             <div className="text-center p-3 rounded-lg bg-secondary/50">
               <Coffee className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
               <p className="text-2xl font-bold">
                 {timeEntries.reduce((s, e) => s + (e.break_minutes || 0), 0)}m
               </p>
               <p className="text-xs text-muted-foreground">Break Time</p>
             </div>
             <div className="text-center p-3 rounded-lg bg-secondary/50">
               <CalendarDays className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
               <p className="text-2xl font-bold">{timeEntries.length}</p>
               <p className="text-xs text-muted-foreground">Entries Today</p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Today's Entries */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Today's Time Entries</CardTitle>
         </CardHeader>
         <CardContent className="p-0">
           {isLoading ? (
             <div className="p-8 text-center text-muted-foreground">Loading...</div>
           ) : timeEntries.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">
               No time entries for today
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Clock In</TableHead>
                   <TableHead>Clock Out</TableHead>
                   <TableHead>Duration</TableHead>
                   <TableHead>Break</TableHead>
                   <TableHead>Notes</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {timeEntries.map((entry) => {
                   const clockIn = new Date(entry.clock_in);
                   const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
                   const duration = clockOut
                     ? differenceInMinutes(clockOut, clockIn)
                     : differenceInMinutes(currentTime, clockIn);
                   const hours = Math.floor(duration / 60);
                   const mins = duration % 60;
 
                   return (
                     <TableRow key={entry.id}>
                       <TableCell>{format(clockIn, "h:mm a")}</TableCell>
                       <TableCell>
                         {clockOut ? (
                           format(clockOut, "h:mm a")
                         ) : (
                           <Badge variant="outline" className="bg-success/20 text-success">
                             Active
                           </Badge>
                         )}
                       </TableCell>
                       <TableCell className="font-mono">
                         {hours}h {mins}m
                       </TableCell>
                       <TableCell>{entry.break_minutes || 0}m</TableCell>
                       <TableCell className="text-muted-foreground text-sm">
                         {entry.notes || "-"}
                       </TableCell>
                     </TableRow>
                   );
                 })}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
 
       {/* Clock In/Out Dialog */}
       <Dialog open={clockDialogOpen} onOpenChange={setClockDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               {isClockedIn ? <LogOut className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
               {isClockedIn ? "Clock Out" : "Clock In"}
             </DialogTitle>
             <DialogDescription>
               {isClockedIn
                 ? `You've been working for ${activeEntry ? getElapsedTime(activeEntry.clock_in) : ""}`
                 : "Start tracking your work time"}
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4">
             {isClockedIn && (
               <div className="space-y-2">
                 <Label>Break Time (minutes)</Label>
                 <Input
                   type="number"
                   value={breakMinutes}
                   onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                   min={0}
                   placeholder="0"
                 />
               </div>
             )}
 
             <div className="space-y-2">
               <Label>Notes (optional)</Label>
               <Input
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 placeholder={isClockedIn ? "End of shift notes..." : "Starting shift..."}
               />
             </div>
 
             <div className="flex gap-3 pt-4">
               <Button variant="outline" className="flex-1" onClick={() => setClockDialogOpen(false)}>
                 Cancel
               </Button>
               <Button
                 variant={isClockedIn ? "destructive" : "default"}
                 className="flex-1 gap-2"
                 onClick={handleClockAction}
                 disabled={clockIn.isPending || clockOut.isPending}
               >
                 {isClockedIn ? (
                   <>
                     <LogOut className="h-4 w-4" />
                     Clock Out
                   </>
                 ) : (
                   <>
                     <LogIn className="h-4 w-4" />
                     Clock In
                   </>
                 )}
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 }