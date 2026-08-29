import React from "react";
import {
  Check,
  Eye,
  X,
  Shield,
  Info,
  UserCheck,
  Lock
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FinanceRole = 'FA' | 'FC' | 'AC' | 'AR' | 'AP' | 'CA' | 'AM' | 'AU' | 'MG';

export const FINANCE_ROLES: Record<FinanceRole, { label: string, description: string }> = {
  FA: { label: "Financial Advisor/Director", description: "Full strategic and operational access." },
  FC: { label: "Financial Controller", description: "Operational management and controls." },
  AC: { label: "Accounts Clerk", description: "Entry-level transaction processing." },
  AR: { label: "AR Executive", description: "Specialized in Accounts Receivable." },
  AP: { label: "AP Executive", description: "Specialized in Accounts Payable." },
  CA: { label: "Credit Manager", description: "Focus on credit limits and collections." },
  AM: { label: "Asset Manager", description: "Focus on fixed assets and depreciation." },
  AU: { label: "Auditor", description: "Review and verification focus." },
  MG: { label: "Management", description: "High-level reporting and oversight." }
};

export type Permission = 'full' | 'view' | 'none';

export interface MatrixRow {
  category: string;
  item: string;
  permissions: Record<FinanceRole, Permission>;
}

export const MATRIX_DATA: MatrixRow[] = [
  // Setup
  { category: "Setup", item: "Chart of Accounts", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Setup", item: "Fiscal Year/Periods", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'none', MG: 'view' } },
  { category: "Setup", item: "Posting Rules", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'none', MG: 'view' } },
  { category: "Setup", item: "Customer/Corp Setup", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'none', CA: 'full', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Setup", item: "Vendor Master", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'none', AP: 'full', CA: 'none', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Setup", item: "Bank/Cash Setup", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Setup", item: "Asset Categories", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'full', AU: 'full', MG: 'view' } },
  { category: "Setup", item: "Tax Rules", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Setup", item: "Budget Templates", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'none', MG: 'view' } },
  { category: "Setup", item: "Role Permissions", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'none', MG: 'view' } },

  // Transactions
  { category: "Transactions", item: "Manual Journals", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'full', CA: 'full', AM: 'full', AU: 'none', MG: 'view' } },
  { category: "Transactions", item: "Reversing Journals", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'none', MG: 'view' } },
  { category: "Transactions", item: "AR Invoice Gen", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'none', CA: 'full', AM: 'none', AU: 'view', MG: 'view' } },
  { category: "Transactions", item: "Payment Receipts", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'none', CA: 'full', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Transactions", item: "Dunning Actions", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'none', CA: 'full', AM: 'none', AU: 'view', MG: 'view' } },
  { category: "Transactions", item: "AP Invoice Posting", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'none', AP: 'full', CA: 'none', AM: 'none', AU: 'view', MG: 'view' } },
  { category: "Transactions", item: "Vendor Payments", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'none', AP: 'full', CA: 'none', AM: 'none', AU: 'view', MG: 'view' } },
  { category: "Transactions", item: "Bank Recon", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'view' } },
  { category: "Transactions", item: "Asset Depr Run", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'full', AU: 'view', MG: 'view' } },
  { category: "Transactions", item: "Period Close", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'none', MG: 'view' } },

  // Reports
  { category: "Reports", item: "Trial Balance", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'full', CA: 'full', AM: 'full', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "Financial Stmts", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "AR Aging", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'none', CA: 'full', AM: 'none', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "AP Aging", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'none', AP: 'full', CA: 'none', AM: 'none', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "Asset Register", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'none', AP: 'none', CA: 'none', AM: 'full', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "Tax Summary", permissions: { FA: 'full', FC: 'full', AC: 'full', AR: 'full', AP: 'full', CA: 'full', AM: 'full', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "Budget Variance", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'full' } },
  { category: "Reports", item: "Audit Logs", permissions: { FA: 'full', FC: 'full', AC: 'none', AR: 'none', AP: 'none', CA: 'none', AM: 'none', AU: 'full', MG: 'full' } },
];

const PermissionIcon = ({ type }: { type: Permission }) => {
  switch (type) {
    case 'full':
      return <Check className="h-4 w-4 text-green-500 mx-auto" />;
    case 'view':
      return <Eye className="h-4 w-4 text-amber-500 mx-auto" />;
    case 'none':
      return <X className="h-4 w-4 text-rose-500/30 mx-auto" />;
  }
};

interface PermissionMatrixProps {
  currentRole?: FinanceRole;
  onRoleChange?: (role: FinanceRole) => void;
  simulationMode?: boolean;
}

export const PermissionMatrix = ({
  currentRole = 'FA',
  onRoleChange,
  simulationMode = false
}: PermissionMatrixProps) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Finance & Accounting Role Matrix</h3>
            <p className="text-sm text-muted-foreground">Comprehensive permission map for all hospitality finance roles.</p>
          </div>
        </div>

        {simulationMode && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FINANCE_ROLES) as FinanceRole[]).map((role) => (
              <Button
                key={role}
                variant={currentRole === role ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs font-bold"
                onClick={() => onRoleChange?.(role)}
              >
                {role}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Permission Table
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-[200px] font-bold">Function / Module</TableHead>
                    {(Object.keys(FINANCE_ROLES) as FinanceRole[]).map((role) => (
                      <TableHead key={role} className={cn(
                        "text-center font-bold text-[10px] px-1",
                        currentRole === role && "bg-primary/5 text-primary ring-1 ring-primary/20"
                      )}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{role}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-bold">{FINANCE_ROLES[role].label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["Setup", "Transactions", "Reports"].map((category) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/5">
                        <TableCell colSpan={10} className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </TableCell>
                      </TableRow>
                      {MATRIX_DATA.filter(d => d.category === category).map((row, idx) => (
                        <TableRow key={`${category}-${idx}`} className="hover:bg-muted/20 transition-colors group">
                          <TableCell className="text-sm font-medium group-hover:text-primary transition-colors">
                            {row.item}
                          </TableCell>
                          {(Object.keys(FINANCE_ROLES) as FinanceRole[]).map((role) => (
                            <TableCell key={role} className={cn(
                              "text-center p-2",
                              currentRole === role && "bg-primary/5 ring-1 ring-primary/10"
                            )}>
                              <PermissionIcon type={row.permissions[role]} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Active Role: {currentRole}
              </CardTitle>
              <CardDescription>{FINANCE_ROLES[currentRole].label}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {FINANCE_ROLES[currentRole].description}
              </p>

              <div className="pt-2 space-y-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Legend</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="p-1 bg-green-500/10 rounded">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span className="font-medium text-foreground">Full Access (Maker/Checker)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="p-1 bg-amber-500/10 rounded">
                      <Eye className="h-3 w-3 text-amber-500" />
                    </div>
                    <span className="font-medium text-foreground">View Only (No Modifications)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="p-1 bg-rose-500/5 rounded">
                      <X className="h-3 w-3 text-rose-500/30" />
                    </div>
                    <span>No Access (Restricted)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <Info className="h-3 w-3" />
                Compliance Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                These permissions are aligned with international financial auditing standards (IFRS/GAAP)
                enforcing strict segregation of duties between procurement, asset management, and general ledger operations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
