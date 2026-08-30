import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const data = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 38000 },
  { month: "Mar", revenue: 55000 },
  { month: "Apr", revenue: 62000 },
  { month: "May", revenue: 58000 },
  { month: "Jun", revenue: 72000 },
  { month: "Jul", revenue: 85000 },
  { month: "Aug", revenue: 92000 },
  { month: "Sep", revenue: 78000 },
  { month: "Oct", revenue: 68000 },
  { month: "Nov", revenue: 75000 },
  { month: "Dec", revenue: 95000 },
];

export function RevenueChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="xl:col-span-2"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Revenue Overview</CardTitle>
          <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-muted-foreground font-medium">Monthly</span>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(220, 12%, 50%)", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(220, 12%, 50%)", fontSize: 11 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                  width={48}
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
