import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Database,
  Users,
  BedDouble,
  CalendarDays,
  UtensilsCrossed,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SeederModule {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  count: number;
}

const seederModules: SeederModule[] = [
  { id: "guests", name: "Guests", icon: Users, description: "Sample guest profiles with contact info", count: 20 },
  { id: "rooms", name: "Rooms", icon: BedDouble, description: "Hotel rooms with various types and statuses", count: 15 },
  { id: "reservations", name: "Reservations", icon: CalendarDays, description: "Bookings across past and future dates", count: 25 },
  { id: "pos", name: "POS Tables", icon: UtensilsCrossed, description: "Restaurant tables with default config", count: 12 },
];

const sampleGuests = [
  { first_name: "John", last_name: "Smith", email: "john.smith@email.com", phone: "+1-555-0101", country: "USA", city: "New York", is_vip: false },
  { first_name: "Sarah", last_name: "Johnson", email: "sarah.j@email.com", phone: "+1-555-0102", country: "USA", city: "Los Angeles", is_vip: true },
  { first_name: "Michael", last_name: "Brown", email: "m.brown@email.com", phone: "+44-20-7946-0958", country: "UK", city: "London", is_vip: false },
  { first_name: "Emma", last_name: "Wilson", email: "emma.wilson@email.com", phone: "+1-555-0104", country: "Canada", city: "Toronto", is_vip: true },
  { first_name: "James", last_name: "Taylor", email: "james.t@email.com", phone: "+1-555-0105", country: "USA", city: "Chicago", is_vip: false },
  { first_name: "Olivia", last_name: "Anderson", email: "olivia.a@email.com", phone: "+61-2-9876-5432", country: "Australia", city: "Sydney", is_vip: false },
  { first_name: "William", last_name: "Thomas", email: "w.thomas@email.com", phone: "+1-555-0107", country: "USA", city: "Miami", is_vip: true },
  { first_name: "Sophia", last_name: "Jackson", email: "sophia.j@email.com", phone: "+1-555-0108", country: "USA", city: "Seattle", is_vip: false },
  { first_name: "Benjamin", last_name: "White", email: "ben.white@email.com", phone: "+49-30-1234-5678", country: "Germany", city: "Berlin", is_vip: false },
  { first_name: "Isabella", last_name: "Harris", email: "isabella.h@email.com", phone: "+1-555-0110", country: "USA", city: "Boston", is_vip: true },
  { first_name: "Lucas", last_name: "Martin", email: "lucas.m@email.com", phone: "+33-1-2345-6789", country: "France", city: "Paris", is_vip: false },
  { first_name: "Mia", last_name: "Garcia", email: "mia.garcia@email.com", phone: "+34-91-123-4567", country: "Spain", city: "Madrid", is_vip: false },
  { first_name: "Henry", last_name: "Martinez", email: "henry.m@email.com", phone: "+1-555-0113", country: "USA", city: "Denver", is_vip: false },
  { first_name: "Amelia", last_name: "Robinson", email: "amelia.r@email.com", phone: "+1-555-0114", country: "USA", city: "Phoenix", is_vip: true },
  { first_name: "Alexander", last_name: "Clark", email: "alex.clark@email.com", phone: "+1-555-0115", country: "USA", city: "San Diego", is_vip: false },
  { first_name: "Charlotte", last_name: "Lewis", email: "charlotte.l@email.com", phone: "+81-3-1234-5678", country: "Japan", city: "Tokyo", is_vip: true },
  { first_name: "Daniel", last_name: "Lee", email: "daniel.lee@email.com", phone: "+82-2-1234-5678", country: "South Korea", city: "Seoul", is_vip: false },
  { first_name: "Harper", last_name: "Walker", email: "harper.w@email.com", phone: "+1-555-0118", country: "USA", city: "Austin", is_vip: false },
  { first_name: "Sebastian", last_name: "Hall", email: "sebastian.h@email.com", phone: "+1-555-0119", country: "USA", city: "Portland", is_vip: false },
  { first_name: "Evelyn", last_name: "Allen", email: "evelyn.a@email.com", phone: "+1-555-0120", country: "USA", city: "Nashville", is_vip: true },
];

const roomTypes = ["Standard", "Deluxe", "Suite", "Executive", "Penthouse"];
const roomStatuses = ["available", "occupied", "maintenance", "reserved"];

const generateRooms = () => {
  const rooms = [];
  for (let floor = 1; floor <= 3; floor++) {
    for (let room = 1; room <= 5; room++) {
      const roomNumber = `${floor}0${room}`;
      const typeIndex = (floor + room) % roomTypes.length;
      const statusIndex = Math.floor(Math.random() * roomStatuses.length);
      rooms.push({
        room_number: roomNumber,
        room_type: roomTypes[typeIndex],
        floor,
        capacity: typeIndex + 1,
        price_per_night: 100 + typeIndex * 50,
        status: roomStatuses[statusIndex],
        amenities: ["WiFi", "TV", "Mini Bar"].slice(0, typeIndex + 1),
        description: `${roomTypes[typeIndex]} room on floor ${floor}`,
      });
    }
  }
  return rooms;
};

const posTables = Array.from({ length: 12 }, (_, i) => ({
  table_number: String(i + 1),
  capacity: [2, 4, 4, 6, 4, 2, 4, 8, 4, 2, 6, 4][i],
  status: "available",
  guests: null,
  server_name: null,
  start_time: null,
  merged_with: null,
  current_order: null,
}));

export function DataSeeder() {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; count: number; error?: string }>>({});

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedModules(seederModules.map((m) => m.id));
  };

  const clearAll = () => {
    setSelectedModules([]);
    setResults({});
  };

  const seedData = async () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module to seed");
      return;
    }

    setSeeding(true);
    setResults({});
    const newResults: Record<string, { success: boolean; count: number; error?: string }> = {};

    try {
      // Seed Guests
      if (selectedModules.includes("guests")) {
        try {
          const { data, error } = await supabase.from("guests").insert(sampleGuests).select();
          if (error) throw error;
          newResults.guests = { success: true, count: data?.length || 0 };
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          newResults.guests = { success: false, count: 0, error: errorMessage };
        }
      }

      // Seed Rooms
      if (selectedModules.includes("rooms")) {
        try {
          const rooms = generateRooms();
          const { data, error } = await supabase.from("rooms").insert(rooms).select();
          if (error) throw error;
          newResults.rooms = { success: true, count: data?.length || 0 };
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          newResults.rooms = { success: false, count: 0, error: errorMessage };
        }
      }

      // Seed POS Tables
      if (selectedModules.includes("pos")) {
        try {
          const { data, error } = await supabase.from("pos_tables").insert(posTables).select();
          if (error) throw error;
          newResults.pos = { success: true, count: data?.length || 0 };
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          newResults.pos = { success: false, count: 0, error: errorMessage };
        }
      }

      // Seed Reservations (requires guests and rooms)
      if (selectedModules.includes("reservations")) {
        try {
          // Get existing guests and rooms
          const { data: guests } = await supabase.from("guests").select("id").limit(20);
          const { data: rooms } = await supabase.from("rooms").select("id").limit(15);

          if (!guests?.length || !rooms?.length) {
            throw new Error("Need guests and rooms to create reservations");
          }

          const reservations = [];
          const today = new Date();
          
          for (let i = 0; i < 25; i++) {
            const checkInOffset = Math.floor(Math.random() * 30) - 15; // -15 to +15 days
            const stayLength = Math.floor(Math.random() * 5) + 1; // 1-5 nights
            const checkIn = new Date(today);
            checkIn.setDate(checkIn.getDate() + checkInOffset);
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + stayLength);

            const statuses = ["confirmed", "checked_in", "checked_out", "cancelled"];
            let status = statuses[Math.floor(Math.random() * statuses.length)];
            
            // Adjust status based on dates
            if (checkIn > today) status = "confirmed";
            if (checkOut < today && status !== "cancelled") status = "checked_out";

            reservations.push({
              reservation_code: `RES-${Date.now()}-${i}`,
              guest_id: guests[i % guests.length].id,
              room_id: rooms[i % rooms.length].id,
              check_in_date: checkIn.toISOString().slice(0, 10),
              check_out_date: checkOut.toISOString().slice(0, 10),
              adults: Math.floor(Math.random() * 2) + 1,
              children: Math.floor(Math.random() * 2),
              status,
              total_amount: (100 + Math.floor(Math.random() * 200)) * stayLength,
              payment_status: status === "checked_out" ? "paid" : "pending",
              source: ["direct", "booking.com", "expedia", "phone"][Math.floor(Math.random() * 4)],
            });
          }

          const { data, error } = await supabase.from("reservations").insert(reservations).select();
          if (error) throw error;
          newResults.reservations = { success: true, count: data?.length || 0 };
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          newResults.reservations = { success: false, count: 0, error: errorMessage };
        }
      }

      setResults(newResults);

      const successCount = Object.values(newResults).filter((r) => r.success).length;
      const failCount = Object.values(newResults).filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(`Successfully seeded ${successCount} module(s)`);
      } else if (successCount > 0) {
        toast.warning(`Seeded ${successCount} module(s), ${failCount} failed`);
      } else {
        toast.error("All seeding operations failed");
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Seeder
        </CardTitle>
        <CardDescription>
          Populate the database with realistic sample data for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {seederModules.map((module) => {
            const Icon = module.icon;
            const result = results[module.id];
            const isSelected = selectedModules.includes(module.id);

            return (
              <div
                key={module.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleModule(module.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleModule(module.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Label className="font-medium cursor-pointer">{module.name}</Label>
                      <Badge variant="outline" className="text-xs">
                        ~{module.count} records
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description}
                    </p>
                    {result && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {result.success ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-success">
                              Created {result.count} records
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">
                              {result.error || "Failed"}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={seedData}
          disabled={seeding || selectedModules.length === 0}
          className="w-full"
        >
          {seeding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Seeding Data...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Seed Selected Modules
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          ⚠️ This will create new records. Duplicates may occur if run multiple times.
        </p>
      </CardContent>
    </Card>
  );
}
