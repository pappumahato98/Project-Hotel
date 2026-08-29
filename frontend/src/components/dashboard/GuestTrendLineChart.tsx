import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

const data = [
  { week: "W1", checkIns: 45, checkOuts: 38 },
  { week: "W2", checkIns: 52, checkOuts: 44 },
  { week: "W3", checkIns: 61, checkOuts: 55 },
  { week: "W4", checkIns: 48, checkOuts: 50 },
  { week: "W5", checkIns: 72, checkOuts: 58 },
  { week: "W6", checkIns: 65, checkOuts: 62 },
  { week: "W7", checkIns: 80, checkOuts: 70 },
  { week: "W8", checkIns: 74, checkOuts: 68 },
];

export function GuestTrendLineChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Guest Trends</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">Check-ins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "hsl(var(--accent))" }} />
              <span className="text-[10px] text-muted-foreground font-medium">Check-outs</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={36}
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
                />
                <Line
                  type="monotone"
                  dataKey="checkIns"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                  name="Check-ins"
                />
                <Line
                  type="monotone"
                  dataKey="checkOuts"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--accent))" }}
                  activeDot={{ r: 5 }}
                  name="Check-outs"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
