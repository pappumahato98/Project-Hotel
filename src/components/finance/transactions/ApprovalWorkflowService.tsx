import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitPullRequest, CheckCircle2, XCircle, Clock, UserCheck, ShieldAlert } from "lucide-react";
import { useApprovalQueue } from "@/hooks/useApprovalQueue";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ApprovalWorkflowService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: items, isLoading, approveItem, rejectItem } = useApprovalQueue();
  const { user } = useAuth();

  const pending = (items || []).filter(i => i.status === "pending");
  const approved = (items || []).filter(i => i.status === "approved");
  const rejected = (items || []).filter(i => i.status === "rejected");

  const handleApprove = async (id: string) => {
    try {
      await approveItem.mutateAsync({ id, approvedBy: user?.id || "" });
      toast.success("Approved");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectItem.mutateAsync({ id, approvedBy: user?.id || "", reason: "Rejected by reviewer" });
      toast.success("Rejected");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-primary" /> Approval Workflow
          </h2>
          <p className="text-muted-foreground text-sm">Centralized hub for financial approvals and maker-checker validation.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          <ShieldAlert className="h-3 w-3 mr-1" /> Maker-Checker Enabled
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardContent className="pt-4 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Pending</p>
            <h3 className="text-2xl font-bold text-amber-500">{pending.length}</h3>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Approved Today</p>
            <h3 className="text-2xl font-bold text-success">{approved.length}</h3>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/10">
          <CardContent className="pt-4 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Rejected</p>
            <h3 className="text-2xl font-bold text-destructive">{rejected.length}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending approvals</p>
            ) : pending.map(req => (
              <div key={req.id} className="p-3 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold capitalize">{req.entity_type} — {req.action}</p>
                    <p className="text-[10px] text-muted-foreground">{req.description || "No description"}</p>
                  </div>
                  {req.amount && <span className="font-bold text-sm">${req.amount.toLocaleString()}</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 border-success text-success hover:bg-success/10"
                    disabled={isReadOnly} onClick={() => handleApprove(req.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 border-destructive text-destructive hover:bg-destructive/10"
                    disabled={isReadOnly} onClick={() => handleReject(req.id)}>
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Recent Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...approved, ...rejected].slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs p-2 border rounded">
                <span className="capitalize">{item.entity_type} — {item.description?.slice(0, 30) || item.action}</span>
                <Badge variant="outline" className={cn("text-[10px]",
                  item.status === "approved" ? "text-success border-success/20" : "text-destructive border-destructive/20"
                )}>{item.status}</Badge>
              </div>
            ))}
            {approved.length === 0 && rejected.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent decisions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
