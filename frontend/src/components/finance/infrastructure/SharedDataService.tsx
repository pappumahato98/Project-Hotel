import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  HardDrive,
  Cloud,
  Shield,
  FileText,
  Search,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SharedDataService({ isReadOnly }: { isReadOnly?: boolean }) {
  const [storageMetrics] = useState([
    { name: 'Financial Ledger Lake', usage: 85, total: '2.5 TB', icon: Database, color: 'text-blue-500' },
    { name: 'Document Archive', usage: 42, total: '10 TB', icon: Cloud, color: 'text-purple-500' },
    { name: 'Audit Log Cold Storage', usage: 12, total: '50 TB', icon: HardDrive, color: 'text-amber-500' },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {storageMetrics.map((metric, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <metric.icon className={cn("h-5 w-5", metric.color)} />
                <Badge variant="secondary" className="text-[10px]">HEALTHY</Badge>
              </div>
              <CardTitle className="text-sm font-bold mt-2">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Capacity</span>
                  <span>{metric.usage}%</span>
                </div>
                <Progress value={metric.usage} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-right">
                  Using 1.2 TB of {metric.total}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Master Data Cache Health</CardTitle>
            <CardDescription>Performance of the in-memory financial master data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/30 border text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Hit Ratio</p>
                <p className="text-xl font-bold">99.2%</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg Response</p>
                <p className="text-xl font-bold">1.2ms</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold flex items-center gap-2">
                <Shield className="h-3 w-3 text-success" /> Integrity Checks
              </h4>
              <div className="space-y-2">
                 {[
                   { name: 'Schema Validation', status: 'Passed' },
                   { name: 'Foreign Key Verification', status: 'Passed' },
                   { name: 'JSONB Indexing', status: 'Optimal' },
                 ].map((check, i) => (
                   <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-background border border-border/50">
                      <span className="text-muted-foreground">{check.name}</span>
                      <span className="font-semibold text-success">{check.status}</span>
                   </div>
                 ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Document Storage Events</CardTitle>
            <CardDescription>Inbound receipts and generated financial reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'Vendor_Invoice_V8821.pdf', size: '2.4 MB', type: 'Invoice', date: '2 mins ago' },
              { name: 'PnL_Report_Feb_2024.xlsx', size: '450 KB', type: 'Report', date: '15 mins ago' },
              { name: 'Guest_Receipt_R102.pdf', size: '1.2 MB', type: 'Receipt', date: '1 hour ago' },
              { name: 'Tax_Submission_Form.xml', size: '89 KB', type: 'Compliance', date: '3 hours ago' },
            ].map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-secondary/20 rounded-md transition-colors border border-transparent hover:border-border">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.type} • {doc.size}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{doc.date}</span>
              </div>
            ))}
            <div className="pt-2 flex gap-2">
               <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                  <Search className="h-3 w-3" /> Search Lake
               </Button>
               <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                  <ExternalLink className="h-3 w-3" /> File Browser
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
