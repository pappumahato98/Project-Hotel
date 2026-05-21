import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal, Clock, ShieldAlert, Lock, User, Info } from "lucide-react";
import { formatAD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/skeletons";

interface GeneralAuditLogTableProps {
  logs: any[] | undefined;
  isLoading: boolean;
}

export const GeneralAuditLogTable = ({ logs, isLoading }: GeneralAuditLogTableProps) => {
  if (isLoading) return <TableSkeleton columns={4} rows={10} />;

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              System Audit Trails
            </CardTitle>
            <CardDescription>
              A complete record of all system-wide administrative actions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse">
            <div className="w-1.5 h-1.5 bg-success rounded-full" />
            Live
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!logs || logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No system logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        {formatAD(new Date(log.created_at), "seconds")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{log.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${
                          log.action.toLowerCase().includes('fail') || log.action.toLowerCase().includes('delete')
                          ? 'border-destructive/50 text-destructive bg-destructive/5'
                          : 'border-primary/50 text-primary bg-primary/5'
                        }`}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">{log.entity_type}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{log.entity_id?.slice(0, 8) || 'N/A'}</span>
                      </div>
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
