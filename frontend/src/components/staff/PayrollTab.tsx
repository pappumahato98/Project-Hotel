import { PayrollPanel } from "@/components/hr/PayrollPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export function PayrollTab() {
  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            My Payroll & Time
          </CardTitle>
          <CardDescription>View your pay slips and clock-in history</CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollPanel />
        </CardContent>
      </Card>
    </div>
  );
}
