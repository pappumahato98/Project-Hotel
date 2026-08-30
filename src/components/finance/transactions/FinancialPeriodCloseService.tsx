/**
 * Financial Period Close View (presentation only).
 * Refactored to consume useFinancialPeriodCloseView.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFinancialPeriodCloseView } from "@/hooks/finance/useFinancialPeriodCloseView";

export function FinancialPeriodCloseService() {
  const { businessDate, isDialogOpen, openDialog, closeDialog, closeDay, isClosing } =
    useFinancialPeriodCloseView();

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
            <Button onClick={openDialog} variant="destructive" className="gap-2">
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
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button variant="destructive" onClick={closeDay} disabled={isClosing}>
              {isClosing ? "Closing..." : "Confirm Day Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
