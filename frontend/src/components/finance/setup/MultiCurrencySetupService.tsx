import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Globe, RefreshCw, Plus, Trash2 } from "lucide-react";

export function MultiCurrencySetupService() {
  const [baseCurrency] = useState("NPR");
  const [autoSync, setAutoSync] = useState(true);
  const [currencies] = useState([
    { code: "USD", name: "US Dollar", rate: 133.45, lastSync: "2024-05-15 10:00 AM" },
    { code: "EUR", name: "Euro", rate: 144.20, lastSync: "2024-05-15 10:00 AM" },
    { code: "GBP", name: "British Pound", rate: 168.50, lastSync: "2024-05-15 10:00 AM" },
    { code: "INR", name: "Indian Rupee", rate: 1.60, lastSync: "Fixed" },
  ]);

  const handleSync = () => {
    toast.success("Exchange rates synchronized successfully with NRB Data Source.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Multi-Currency & Exchange Rates
          </h2>
          <p className="text-muted-foreground text-sm">Manage base currency, foreign currencies, and automated exchange rate synchronization.</p>
        </div>
        <Button onClick={handleSync} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Sync Now
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Core Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Base System Currency</Label>
              <div className="flex items-center gap-2">
                <Input value={baseCurrency} readOnly className="bg-secondary/50 font-mono font-bold" />
                <Badge variant="outline" className="text-xs">Default</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">All financial reports are consolidated in this currency.</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync Rates</Label>
                  <p className="text-xs text-muted-foreground">Fetch daily rates at 00:00</p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>
              
              <div className="space-y-2">
                <Label>Data Source</Label>
                <div className="p-3 border rounded-md bg-secondary/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Nepal Rastra Bank (NRB)</span>
                    <span className="text-xs text-muted-foreground">Primary Provider</span>
                  </div>
                  <Badge className="bg-success/20 text-success hover:bg-success/30">Active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
              <CardDescription>Currencies enabled for transactions and invoicing.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-3 w-3" /> Add Currency
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Exchange Rate</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-secondary/10">
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        <Badge variant="secondary">NPR</Badge> Nepalese Rupee
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">1.0000</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Base Currency</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {currencies.map((c) => (
                    <TableRow key={c.code}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <Badge variant="outline">{c.code}</Badge> {c.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{c.rate.toFixed(4)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.lastSync}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
