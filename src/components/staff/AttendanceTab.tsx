import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Calendar, Loader2, Clock, Download, FileText } from "lucide-react";
import { useTimeClock } from "@/hooks/useHR";
import { formatAD } from "@/lib/utils";
import { format } from "date-fns";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";

export function AttendanceTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: entries = [], isLoading } = useTimeClock(selectedDate);

  const clockedIn = entries.filter((e: any) => !e.clock_out).length;
  const totalHours = entries.reduce((sum: number, e: any) => {
    if (!e.clock_out) return sum;
    const diff = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
    return sum + (diff / 3600000) - (e.break_minutes || 0) / 60;
  }, 0);

  const handleExportPDF = () => {
    exportToPDF({
      title: `Attendance Report - ${formatAD(selectedDate)}`,
      headers: ["Staff", "Clock In", "Clock Out", "Break (min)", "Status"],
      rows: entries.map((e: any) => [
        `${e.staff?.first_name || ""} ${e.staff?.last_name || ""}`,
        format(new Date(e.clock_in), "HH:mm"),
        e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "—",
        e.break_minutes || 0,
        e.clock_out ? "Completed" : "Active",
      ]),
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: `Attendance_${selectedDate}`,
      headers: ["Staff", "Clock In", "Clock Out", "Break (min)", "Status"],
      rows: entries.map((e: any) => [
        `${e.staff?.first_name || ""} ${e.staff?.last_name || ""}`,
        format(new Date(e.clock_in), "HH:mm"),
        e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "—",
        e.break_minutes || 0,
        e.clock_out ? "Completed" : "Active",
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar className="h-5 w-5 text-primary" />
        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-48" />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Currently Clocked In</p>
            <p className="text-2xl font-bold text-success">{clockedIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Hours Worked</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Attendance Records</CardTitle>
          <CardDescription>{formatAD(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No attendance records for this date.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Break (min)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.staff?.first_name} {e.staff?.last_name}</TableCell>
                    <TableCell>{format(new Date(e.clock_in), "HH:mm")}</TableCell>
                    <TableCell>{e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "—"}</TableCell>
                    <TableCell>{e.break_minutes || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={!e.clock_out ? "text-success" : ""}>
                        {e.clock_out ? "Completed" : "Active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
