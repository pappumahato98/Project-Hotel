import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

const data = [
  { day: "Mon", occupancy: 78, available: 22 },
  { day: "Tue", occupancy: 85, available: 15 },
  { day: "Wed", occupancy: 92, available: 8 },
  { day: "Thu", occupancy: 88, available: 12 },
  { day: "Fri", occupancy: 95, available: 5 },
  { day: "Sat", occupancy: 98, available: 2 },
  { day: "Sun", occupancy: 82, available: 18 },
];

export function OccupancyBarChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Weekly Occupancy</CardTitle>
          <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-muted-foreground font-medium">This Week</span>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(225, 25%, 9%)",
                    border: "1px solid hsl(225, 18%, 16%)",
                    borderRadius: "10px",
                    color: "hsl(40, 15%, 94%)",
                    fontSize: "13px",
                    padding: "8px 12px",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === "occupancy" ? "Occupied" : "Available",
                  ]}
                />
                <Bar dataKey="occupancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
