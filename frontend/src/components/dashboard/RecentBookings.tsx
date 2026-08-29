import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const bookings = [
  { id: 1, guest: "Sarah Johnson", room: "Suite 401", checkIn: "Dec 20", checkOut: "Dec 24", status: "confirmed" },
  { id: 2, guest: "Michael Chen", room: "Deluxe 302", checkIn: "Dec 21", checkOut: "Dec 23", status: "pending" },
  { id: 3, guest: "Emma Wilson", room: "Standard 105", checkIn: "Dec 22", checkOut: "Dec 25", status: "confirmed" },
  { id: 4, guest: "James Brown", room: "Suite 502", checkIn: "Dec 23", checkOut: "Dec 28", status: "checked-in" },
  { id: 5, guest: "Lisa Anderson", room: "Deluxe 201", checkIn: "Dec 24", checkOut: "Dec 26", status: "confirmed" },
];

const statusColors = {
  confirmed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  "checked-in": "bg-primary/10 text-primary border-primary/20",
};

export function RecentBookings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Bookings</CardTitle>
          <Link to="/reservations" className="text-xs text-primary hover:underline font-medium">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs font-semibold">
                      {booking.guest.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{booking.guest}</p>
                    <p className="text-xs text-muted-foreground">{booking.room}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:block sm:text-right ml-12 sm:ml-0">
                  <p className="text-xs text-muted-foreground">
                    {booking.checkIn} – {booking.checkOut}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${statusColors[booking.status as keyof typeof statusColors]}`}
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
