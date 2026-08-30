import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus, Edit2, Trash2 } from "lucide-react";

export function CostCenterSetupService() {
  const [costCenters, setCostCenters] = useState([
    { id: "CC-001", name: "Rooms Division", type: "Profit Center", manager: "Alice Johnson", status: "Active" },
    { id: "CC-002", name: "Food & Beverage", type: "Profit Center", manager: "Chef Marco", status: "Active" },
    { id: "CC-003", name: "Spa & Wellness", type: "Profit Center", manager: "Sarah Lee", status: "Active" },
    { id: "CC-004", name: "Admin & General", type: "Cost Center", manager: "Robert Smith", status: "Active" },
    { id: "CC-005", name: "Sales & Marketing", type: "Cost Center", manager: "Emily Davis", status: "Active" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Cost Centers & Departments
          </h2>
          <p className="text-muted-foreground text-sm">Configure profit centers and cost centers for granular departmental accounting.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New Cost Center
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Departmental Structure</CardTitle>
          <CardDescription>All revenue and expenses must be tagged to one of these centers.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center ID</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department Head</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.map((cc) => (
                <TableRow key={cc.id}>
                  <TableCell className="font-mono text-xs font-medium">{cc.id}</TableCell>
                  <TableCell className="font-medium">{cc.name}</TableCell>
                  <TableCell>
                    <Badge variant={cc.type === "Profit Center" ? "default" : "secondary"}>
                      {cc.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{cc.manager}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">{cc.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
