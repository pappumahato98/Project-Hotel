import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Car, MapPin, Plus, Clock, CheckCircle2, User, Phone, Map, Plane, Utensils } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const mockRequests = [
  { id: 1, guest: "John Smith", room: "101", type: "Luggage", status: "pending", time: "10:30 AM", notes: "2 large bags to lobby" },
  { id: 2, guest: "Alice Johnson", room: "305", type: "Valet", status: "in-progress", time: "11:00 AM", notes: "Retrieve car, license XYZ123" },
  { id: 3, guest: "Michael Brown", room: "402", type: "Wake-up", status: "completed", time: "06:00 AM", notes: "Call at 6:00 AM" },
];

const mockTransport = [
  { id: 1, guest: "Emma Wilson", room: "205", type: "Airport Transfer", vehicle: "SUV", time: "02:00 PM", destination: "JFK Airport", status: "confirmed" },
  { id: 2, guest: "David Lee", room: "510", type: "Taxi", vehicle: "Standard", time: "Asap", destination: "City Center", status: "pending" },
];

const mockBookings = [
  { id: 1, guest: "Sarah Davis", room: "308", type: "Restaurant", details: "Le Bernardin, Table for 2", time: "07:30 PM", status: "confirmed" },
  { id: 2, guest: "James Taylor", room: "112", type: "Tour", details: "City Sightseeing Bus", time: "09:00 AM tomorrow", status: "pending" },
];

export function ConciergePanel() {
  const [activeTab, setActiveTab] = useState("requests");
  
  const handleQuickAdd = () => {
    toast.success("Quick add modal would open here");
  };

  const completeTask = (id: number) => {
    toast.success(`Task ${id} marked as completed`);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Concierge Desk</h2>
          <p className="text-muted-foreground">Manage guest requests, transportation, and local bookings</p>
        </div>
        <Button onClick={handleQuickAdd} className="gap-2">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 require immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Transfers Today</CardTitle>
            <Car className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Next departure in 45 mins</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <MapPin className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Across 6 different venues</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="requests">Guest Requests</TabsTrigger>
          <TabsTrigger value="transport">Transportation</TabsTrigger>
          <TabsTrigger value="bookings">Local Bookings</TabsTrigger>
        </TabsList>

        <div className="mt-4 border rounded-md">
          <TabsContent value="requests" className="m-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Guest & Room</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.guest}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Room {req.room}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        req.type === 'Luggage' ? "border-amber-500 text-amber-600" :
                        req.type === 'Valet' ? "border-blue-500 text-blue-600" :
                        "border-purple-500 text-purple-600"
                      )}>
                        {req.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.notes}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" /> {req.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.status === 'completed' ? 'default' : 'secondary'} 
                             className={req.status === 'completed' ? 'bg-success hover:bg-success' : ''}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status !== 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => completeTask(req.id)} className="text-success hover:text-success hover:bg-success/10">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Done
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="transport" className="m-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Guest & Room</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransport.map((trans) => (
                  <TableRow key={trans.id}>
                    <TableCell>
                      <div className="font-medium">{trans.guest}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Room {trans.room}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {trans.type === 'Airport Transfer' ? <Plane className="h-4 w-4 text-blue-500" /> : <Car className="h-4 w-4 text-amber-500" />}
                        <span>{trans.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <MapPin className="h-3 w-3 text-muted-foreground" /> {trans.destination}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" /> {trans.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={trans.status === 'confirmed' ? "border-success text-success" : ""}>
                        {trans.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="bookings" className="m-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Guest & Room</TableHead>
                  <TableHead>Booking Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{booking.guest}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Room {booking.room}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {booking.type === 'Restaurant' ? <Utensils className="h-4 w-4 text-orange-500" /> : <Map className="h-4 w-4 text-emerald-500" />}
                        <span>{booking.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{booking.details}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" /> {booking.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={booking.status === 'confirmed' ? "border-success text-success" : ""}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
