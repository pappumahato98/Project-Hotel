import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, History, Filter, Calendar, Clock } from "lucide-react";
import { RoleChangeAudit, AppRole, roleConfig } from "@/hooks/useUsersWithRoles";
import { RoleBadge } from "./RoleBadge";
import { TableSkeleton } from "@/components/skeletons";
import { formatAD } from "@/lib/utils";

interface AuditLogTableProps {
  logs: RoleChangeAudit[] | undefined;
  isLoading: boolean;
  searchQuery: string;
  roleFilter: string;
  dateFilter: string;
  onSearchChange: (query: string) => void;
  onRoleFilterChange: (role: string) => void;
  onDateFilterChange: (date: string) => void;
}

export const AuditLogTable = ({
  logs,
  isLoading,
  searchQuery,
  roleFilter,
  dateFilter,
  onSearchChange,
  onRoleFilterChange,
  onDateFilterChange,
}: AuditLogTableProps) => {
  const filteredLogs = logs?.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.changed_by_email?.toLowerCase().includes(searchLower);

    const matchesRole = roleFilter === "all" ||
      log.old_role === roleFilter ||
      log.new_role === roleFilter;

    const logDate = new Date(log.created_at);
    const now = new Date();
    let matchesDate = true;
    if (dateFilter === "today") {
      matchesDate = logDate.toDateString() === now.toDateString();
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = logDate >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = logDate >= monthAgo;
    }

    return matchesSearch && matchesRole && matchesDate;
  });

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Role Change Audit Log
              </CardTitle>
              <CardDescription>
                Track all role changes for security and compliance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              Live
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={onRoleFilterChange}>
              <SelectTrigger className="w-full sm:w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={onDateFilterChange}>
              <SelectTrigger className="w-full sm:w-36">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton columns={4} rows={5} />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatAD(new Date(log.created_at), "time")}
                        </div>
                      </TableCell>
                      <TableCell>{log.user_email}</TableCell>
                      <TableCell className="text-muted-foreground">{log.changed_by_email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={log.old_role as AppRole} showIcon={false} />
                          <span className="text-muted-foreground">→</span>
                          <RoleBadge role={log.new_role as AppRole} showIcon={false} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
