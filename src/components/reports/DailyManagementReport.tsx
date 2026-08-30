import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Hotel, Bed, Coffee, Users, Wrench, Shield, TrendingUp, Sparkles, Building2, UserCheck } from "lucide-react";

interface DMRProps {
  data: any; // Ideally typed to ManagementKPIs + extra operational data
  isLoading?: boolean;
}

export const DailyManagementReport = ({ data, isLoading }: DMRProps) => {
  if (isLoading) return <div className="p-8 text-center">Generating Executive Report...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* 1. EXECUTIVE SUMMARY */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <TrendingUp className="h-5 w-5" />
          <h2 className="text-xl font-bold tracking-tight uppercase">1. Executive Summary</h2>
        </div>
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">House Occupancy %</p>
                <p className="text-2xl font-bold">{data?.occupancy}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ADR</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.adr || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RevPAR</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.revpar || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(data?.totalRevenue || 0)}</p>
              </div>
            </div>
            <Separator className="my-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-2 rounded bg-muted/50">
                <span className="font-semibold block mb-1">vs. Yesterday</span>
                <span className="text-green-600 font-medium">+4.2% Growth</span>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <span className="font-semibold block mb-1">vs. Last Year</span>
                <span className="text-blue-600 font-medium">+12.8% YoY</span>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <span className="font-semibold block mb-1">vs. Budget</span>
                <span className="text-amber-600 font-medium">98.5% Realization</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 2. ROOMS DIVISION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Bed className="h-5 w-5" />
            <h2 className="text-lg font-bold tracking-tight uppercase">2. Rooms Division</h2>
          </div>
          <Card>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Available</TableCell>
                  <TableCell className="text-right">120</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Rooms Sold</TableCell>
                  <TableCell className="text-right">{data?.guestMovement.find((m: any) => m.label === 'arrivals')?.count + 45 || 0}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Complimentary</TableCell>
                  <TableCell className="text-right">2</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-red-600">Out-of-Order</TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">3</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* 4. FOOD & BEVERAGE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Coffee className="h-5 w-5" />
            <h2 className="text-lg font-bold tracking-tight uppercase">4. Food & Beverage</h2>
          </div>
          <Card>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Restaurant Revenue</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(data?.fbRevenue * 0.7 || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Bar Revenue</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(data?.fbRevenue * 0.2 || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Room Service</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(data?.fbRevenue * 0.1 || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Covers</TableCell>
                  <TableCell className="text-right">84</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>

      {/* 3. FRONT OFFICE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Building2 className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-tight uppercase">3. Front Office Highlights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-muted-foreground uppercase text-[10px] font-bold">VIP Arrivals</span>
            <span className="text-2xl font-bold">5</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-muted-foreground uppercase text-[10px] font-bold">Guest Complaints</span>
            <span className="text-2xl font-bold text-red-500">1</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <span className="text-muted-foreground uppercase text-[10px] font-bold">Lost & Found</span>
            <span className="text-2xl font-bold">2</span>
          </Card>
        </div>
      </section>

      {/* 5. BANQUET / EVENTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-tight uppercase">5. Banquet & Events</h2>
        </div>
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-medium">Daily Event Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(data?.otherRevenue || 12500)}</p>
            </div>
            <Badge variant="secondary">3 Events Hosted</Badge>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between"><span>Wedding Reception (Grand Hall)</span><span className="font-medium">350 Guests</span></div>
            <div className="flex justify-between"><span>Tech Summit 2026 (Meeting Room B)</span><span className="font-medium">50 Guests</span></div>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 6. HOUSEKEEPING */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase flex items-center gap-2"><Sparkles className="h-4 w-4" /> 6. Housekeeping</h3>
          <Card className="p-3 text-sm">
            <div className="flex justify-between mb-1"><span>Rooms Cleaned</span><span className="font-bold">85</span></div>
            <div className="flex justify-between"><span>Linen Usage</span><span className="font-bold text-muted-foreground">320 Units</span></div>
          </Card>
        </section>

        {/* 7. MAINTENANCE */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase flex items-center gap-2"><Wrench className="h-4 w-4" /> 7. Engineering</h3>
          <Card className="p-3 text-sm">
            <div className="flex justify-between mb-1"><span>Requests Fixed</span><span className="font-bold">12</span></div>
            <div className="flex justify-between"><span>Pending</span><span className="font-bold text-amber-600">2</span></div>
          </Card>
        </section>

        {/* 10. GUEST EXPERIENCE */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase flex items-center gap-2"><UserCheck className="h-4 w-4" /> 10. Guest Exp.</h3>
          <Card className="p-3 text-sm">
            <div className="flex justify-between mb-1"><span>Satisfaction Score</span><span className="font-bold text-green-600">9.4 / 10</span></div>
            <div className="flex justify-between"><span>Resolved Issues</span><span className="font-bold">100%</span></div>
          </Card>
        </section>
      </div>

      {/* 8. FINANCE REPORT */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-tight uppercase">8. Finance & Payments</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Revenue Mix</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Cash Collection</span><span>{formatCurrency(2450)}</span></div>
              <div className="flex justify-between"><span>Credit Cards</span><span>{formatCurrency(18900)}</span></div>
              <div className="flex justify-between"><span>City Ledger (Credit)</span><span className="font-bold text-blue-600">{formatCurrency(4500)}</span></div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardHeader className="py-3"><CardTitle className="text-sm">Net Position</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
               <div className="flex justify-between text-lg font-bold"><span>Gross Operating Revenue</span><span>{formatCurrency(data?.totalRevenue || 0)}</span></div>
               <div className="flex justify-between text-muted-foreground"><span>Estimated GOP %</span><span>38.5%</span></div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
