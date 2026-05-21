import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const rooms = [
  { number: "101", status: "occupied", floor: 1 },
  { number: "102", status: "available", floor: 1 },
  { number: "103", status: "cleaning", floor: 1 },
  { number: "104", status: "occupied", floor: 1 },
  { number: "105", status: "available", floor: 1 },
  { number: "201", status: "occupied", floor: 2 },
  { number: "202", status: "maintenance", floor: 2 },
  { number: "203", status: "available", floor: 2 },
  { number: "204", status: "occupied", floor: 2 },
  { number: "205", status: "cleaning", floor: 2 },
  { number: "301", status: "available", floor: 3 },
  { number: "302", status: "occupied", floor: 3 },
  { number: "303", status: "available", floor: 3 },
  { number: "304", status: "occupied", floor: 3 },
  { number: "305", status: "available", floor: 3 },
];

const statusStyles = {
  occupied: "bg-primary/10 border-primary/25 text-primary",
  available: "bg-success/10 border-success/25 text-success",
  cleaning: "bg-warning/10 border-warning/25 text-warning",
  maintenance: "bg-destructive/10 border-destructive/25 text-destructive",
};

const legendDots = {
  occupied: "bg-primary",
  available: "bg-success",
  cleaning: "bg-warning",
  maintenance: "bg-destructive",
};

export function RoomStatusGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Room Status</CardTitle>
          <Link to="/rooms" className="text-xs text-primary hover:underline font-medium">
            Manage
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {rooms.map((room) => (
              <div
                key={room.number}
                className={cn(
                  "flex items-center justify-center h-10 rounded-lg border font-medium text-xs transition-all hover:scale-105 cursor-pointer",
                  statusStyles[room.status as keyof typeof statusStyles]
                )}
              >
                {room.number}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-3 border-t border-border/60">
            {Object.entries(legendDots).map(([status, dotClass]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", dotClass)} />
                <span className="text-[10px] text-muted-foreground capitalize font-medium">{status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
