import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, ShieldCheck, Activity, CalendarDays } from "lucide-react";
import { useAccounts, useCreateAccount, Account } from "@/hooks/useFinance";
import { toast } from "sonner";
import { useBusinessDate } from "@/hooks/useSettings";

const accountTypeColors: Record<string, string> = {
  asset: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  liability: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  equity: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  revenue: "bg-success/20 text-success border-success/30",
  expense: "bg-destructive/20 text-destructive border-destructive/30",
};

interface ChartOfAccountsServiceProps {
  isReadOnly?: boolean;
}

export function ChartOfAccountsService({ isReadOnly }: ChartOfAccountsServiceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [accountCategory, setAccountCategory] = useState("all");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    type: "asset" as Account["type"],
    description: "",
  });

  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const { data: businessDate } = useBusinessDate();

  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = accountCategory === "all" || a.type === accountCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateAccount = async () => {
    if (!newAccount.code || !newAccount.name) {
      toast.error("Please fill in account code and name");
      return;
    }

    try {
      await createAccount.mutateAsync({
        code: newAccount.code,
        name: newAccount.name,
        type: newAccount.type,
        description: newAccount.description || null,
        parent_id: null,
        is_active: true,
      });
      toast.success("Account created successfully");
      setAccountDialogOpen(false);
      setNewAccount({ code: "", name: "", type: "asset", description: "" });
    } catch (error) {
      toast.error("Failed to create account");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={accountCategory} onValueChange={setAccountCategory} className="w-auto">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="asset">Assets</TabsTrigger>
            <TabsTrigger value="liability">Liabilities</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!isReadOnly && (
            <Button size="sm" onClick={() => setAccountDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Account
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>Manage your hotel's financial structure and account hierarchy</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <Activity className="h-3 w-3 mr-1" /> Live
              </Badge>
              <Badge variant="outline">
                <CalendarDays className="h-3 w-3 mr-1" /> {businessDate || "Today"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No accounts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id} className="group hover:bg-secondary/50">
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={accountTypeColors[account.type]}>
                        {account.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          account.is_active
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Add a new account to the chart of accounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Code</Label>
                <Input
                  placeholder="e.g., 1000"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount((p) => ({ ...p, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={newAccount.type}
                  onValueChange={(v: Account["type"]) =>
                    setNewAccount((p) => ({ ...p, type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                placeholder="e.g., Cash on Hand"
                value={newAccount.name}
                onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Brief description..."
                value={newAccount.description}
                onChange={(e) => setNewAccount((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAccount} disabled={createAccount.isPending}>
                {createAccount.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
