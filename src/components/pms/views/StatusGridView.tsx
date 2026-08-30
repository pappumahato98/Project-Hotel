import React from "react";
import {
  PMSRoomCard
} from "../PMSRoomCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusGridViewProps {
  rooms: any[];
  roomOccupancy: any;
  isLoading: boolean;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  handleRefresh: () => void;
  handleAction: (action: string, room: any) => void;
}

export const StatusGridView = ({
  rooms,
  roomOccupancy,
  isLoading,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  handleRefresh,
  handleAction
}: StatusGridViewProps) => {
  const filteredRooms = rooms.filter(room => {
    const matchesStatus = statusFilter === 'all' || room.status.toLowerCase() === statusFilter;
    const matchesSearch = room.room_number.includes(searchQuery) ||
                         room.room_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header / Toolbar */}
      <div className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="bg-transparent">
            <TabsList className="bg-secondary/50 border border-border p-1 h-9">
              {['all', 'available', 'occupied', 'dirty', 'maintenance', 'blocked'].map(status => (
                <TabsTrigger
                  key={status}
                  value={status}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider h-7 px-4",
                    "data-[state=active]:bg-cyan-500 data-[state=active]:text-black"
                  )}
                >
                  {status}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="SEARCH ROOMS..."
              className="w-64 bg-secondary/50 border-border h-9 pl-9 text-[10px] font-bold tracking-wider focus:ring-primary focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Room Grid */}
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Initializing PMS Core...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredRooms.map((room) => {
              const occupancy = roomOccupancy[room.id];
              return (
                <PMSRoomCard
                  key={room.id}
                  room={{
                    id: room.id,
                    room_number: room.room_number,
                    room_type: room.room_type,
                    status: room.status,
                    price_per_night: room.price_per_night
                  }}
                  currentGuest={occupancy ? {
                    name: occupancy.guestName,
                    checkoutDate: occupancy.checkoutDate,
                    keyIssued: occupancy.keyIssued,
                    balance: occupancy.balance
                  } : undefined}
                  arrivalToday={occupancy?.arrivalToday}
                  onAction={handleAction}
                />
              );
            })}
          </div>
        )}

        {!isLoading && filteredRooms.length === 0 && (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">No rooms found matching filters</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
