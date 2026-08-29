import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Calendar, CheckCircle2 } from "lucide-react";
import { useBusinessDate, useUpdateBusinessDate } from "@/hooks/useSettings";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function FinancialPeriodCloseService() {
  const { data: businessDate } = useBusinessDate();
  const updateBusinessDate = useUpdateBusinessDate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDayClose = async () => {
    if (!businessDate) return;
    const currentDate = new Date(businessDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDate = currentDate.toISOString().split("T")[0];

    try {
      await updateBusinessDate.mutateAsync(nextDate);
      toast.success(`Business day closed. New date: ${nextDate}`);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to close business day");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Period Close</CardTitle>
          <CardDescription>Manage business date rollovers and period locks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Active Business Date</p>
                <p className="text-2xl font-bold font-display">{businessDate || "Loading..."}</p>
              </div>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} variant="destructive" className="gap-2">
              <Lock className="h-4 w-4" /> Close Business Day
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Month-End Closure</span>
                  <Badge variant="outline" className="text-success border-success/20">Open</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Current financial month is open for postings.</p>
             </div>
             <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Audit Lock</span>
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20">Unlocked</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Historical data is currently editable by admins.</p>
             </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Business Day?</DialogTitle>
            <DialogDescription>
              This will advance the business date from {businessDate} to the next day.
              Make sure all transactions for today have been posted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDayClose}>Confirm Day Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
