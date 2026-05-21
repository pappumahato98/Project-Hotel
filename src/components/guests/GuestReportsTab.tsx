import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGuests } from "@/hooks/useGuests";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, Users, Star, Globe, MessageSquare } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8b5cf6", "#06b6d4"];

export const GuestReportsTab = () => {
  const { data: guests = [] } = useGuests();

  const { data: commStats = { total: 0 } } = useQuery({
    queryKey: ["guest-comm-stats"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("guest_communications")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { total: count || 0 };
    },
  });

  const stats = useMemo(() => {
    const total = guests.length;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = guests.filter(g => new Date(g.created_at) >= thisMonth).length;
    const vipCount = guests.filter(g => g.is_vip).length;
    const totalSpending = guests.reduce((s, g) => s + (g.total_spending || 0), 0);
    const avgSpending = total > 0 ? totalSpending / total : 0;

    const byCountry: Record<string, number> = {};
    guests.forEach(g => {
      const country = (g as any).country || "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;
    });

    const topSpenders = [...guests]
      .sort((a, b) => (b.total_spending || 0) - (a.total_spending || 0))
      .slice(0, 10);

    return { total, newThisMonth, vipCount, totalSpending, avgSpending, byCountry, topSpenders };
  }, [guests]);

  const countryData = Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const handleExportPDF = () => {
    exportToPDF({
      title: "Guest Analytics Report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Guests", stats.total],
        ["New This Month", stats.newThisMonth],
        ["VIP Guests", stats.vipCount],
        ["Total Spending", formatCurrency(stats.totalSpending)],
        ["Avg Spending/Guest", formatCurrency(stats.avgSpending)],
        ["Communications Sent", commStats.total],
        ...stats.topSpenders.map((g, i) => [
          `#${i + 1} ${g.first_name} ${g.last_name}`,
          formatCurrency(g.total_spending || 0),
        ]),
      ],
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Guest_Analytics",
      headers: ["Name", "Email", "Phone", "Visits", "Total Spent", "VIP", "Country"],
      rows: guests.map(g => [
        `${g.first_name} ${g.last_name}`,
        g.email || "",
        g.phone || "",
        g.total_visits || 0,
        g.total_spending || 0,
        g.is_vip ? "Yes" : "No",
        (g as any).country || "",
      ]),
    });
  };

  // Guest Retention Report
  const retentionReport = useMemo(() => {
    return [...guests]
      .filter((g) => (g.total_visits || 0) > 0)
      .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))
      .slice(0, 20)
      .map((g) => ({
        name: `${g.first_name} ${g.last_name}`,
        visits: g.total_visits || 0,
        firstVisit: g.created_at ? g.created_at.split("T")[0] : "—",
        lifetime: g.total_spending || 0,
        vip: g.is_vip ? "Yes" : "No",
      }));
  }, [guests]);

  // Communication Log Summary
  const { data: commDetails = [] } = useQuery({
    queryKey: ["guest-comm-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_communications")
        .select("channel, direction");
      if (error) throw error;
      return data || [];
    },
  });

  const commSummary = useMemo(() => {
    const byChannel: Record<string, { sent: number; received: number; total: number }> = {};
    commDetails.forEach((c: any) => {
      if (!byChannel[c.channel]) byChannel[c.channel] = { sent: 0, received: 0, total: 0 };
      byChannel[c.channel].total++;
      if (c.direction === "outbound") byChannel[c.channel].sent++;
      else byChannel[c.channel].received++;
    });
    return Object.entries(byChannel).map(([channel, d]) => ({ channel, ...d }));
  }, [commDetails]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Guest Analytics</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Guests" value={String(stats.total)} change={`${stats.newThisMonth} new this month`} changeType="positive" icon={Users} delay={0} />
        <MetricCard title="VIP Guests" value={String(stats.vipCount)} change={`${stats.total > 0 ? ((stats.vipCount / stats.total) * 100).toFixed(0) : 0}% of total`} changeType="neutral" icon={Star} delay={50} />
        <MetricCard title="Total Spending" value={formatCurrency(stats.totalSpending)} change={`Avg ${formatCurrency(stats.avgSpending)}`} changeType="positive" icon={Users} delay={100} />
        <MetricCard title="Communications" value={String(commStats.total)} change="All channels" changeType="neutral" icon={MessageSquare} delay={150} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Guest Origin
            </CardTitle>
          </CardHeader>
          <CardContent>
            {countryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={countryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {countryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No country data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Top Spenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topSpenders.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.first_name} {g.last_name}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(g.total_spending || 0)}</TableCell>
                  </TableRow>
                ))}
                {stats.topSpenders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No guest data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Guest Retention Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Guest Retention Report</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToPDF({
              title: "Guest Retention Report",
              headers: ["Guest", "Visits", "First Visit", "Lifetime Value", "VIP"],
              rows: retentionReport.map(r => [r.name, r.visits, r.firstVisit, formatCurrency(r.lifetime), r.vip]),
            })}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead>First Visit</TableHead>
                <TableHead className="text-right">Lifetime Value</TableHead>
                <TableHead>VIP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retentionReport.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No returning guests</TableCell></TableRow>
              ) : retentionReport.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right font-bold">{r.visits}</TableCell>
                  <TableCell>{r.firstVisit}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.lifetime)}</TableCell>
                  <TableCell>{r.vip === "Yes" ? <span className="text-amber-500 font-bold">VIP</span> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Communication Log Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Log Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commSummary.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No communications</TableCell></TableRow>
              ) : commSummary.map((c) => (
                <TableRow key={c.channel}>
                  <TableCell className="font-medium capitalize">{c.channel}</TableCell>
                  <TableCell className="text-right font-bold">{c.total}</TableCell>
                  <TableCell className="text-right">{c.sent}</TableCell>
                  <TableCell className="text-right">{c.received}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
