import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Filter, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const LogsReportTab = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_logs", staffFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (staffFilter !== "all") {
        query = query.eq("user_id", staffFilter);
      } else if (profile?.id) {
        // If not admin/manager and no filter, default to own logs?
        // Actually RLS handles this, but we can be explicit.
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: staffMembers } = useQuery({
    queryKey: ["staff_members_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name");
      if (error) throw error;
      return data;
    },
  });

  const getStaffName = (userId: string | null) => {
    if (!userId) return "System";
    const staff = staffMembers?.find(s => s.user_id === userId);
    return staff ? `${staff.first_name} ${staff.last_name}` : "Unknown";
  };

  const filteredLogs = logs?.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getStaffName(log.user_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Activity Logs
            </CardTitle>
            <CardDescription>Monitor system-wide staff activities and changes.</CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.first_name} {staff.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      {getStaffName(log.user_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.entity_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAD(new Date(log.created_at), "time")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {log.new_values ? JSON.stringify(log.new_values) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
