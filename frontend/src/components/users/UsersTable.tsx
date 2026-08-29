import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Users, KeyRound, Loader2 } from "lucide-react";
import { UserWithRole, AppRole, roleConfig } from "@/hooks/useUsersWithRoles";
import { RoleBadge, MultiRoleBadge } from "./RoleBadge";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface UsersTableProps {
  users: UserWithRole[] | undefined;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRoleChange: (userId: string, oldRole: AppRole, newRole: AppRole) => void;
  isUpdating: boolean;
}

export const UsersTable = ({
  users,
  isLoading,
  searchQuery,
  onSearchChange,
  onRoleChange,
  isUpdating,
}: UsersTableProps) => {
  const [resettingId, setResettingId] = useState<string | null>(null);

  const handleResetPassword = async (email: string, id: string) => {
    if (!email) return;
    setResettingId(id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?tab=reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset link sent to ${email}`);
    } catch (error: any) {
      toast.error("Failed to send reset link: " + error.message);
    } finally {
      setResettingId(null);
    }
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>
                View and manage user roles across the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              Live
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton columns={4} rows={5} />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {(userItem.first_name?.[0] || "") + (userItem.last_name?.[0] || "") || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {userItem.first_name || ""} {userItem.last_name || ""}
                              {!userItem.first_name && !userItem.last_name && "Unnamed User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {userItem.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {userItem.email || "No email"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={userItem.role} />
                          {userItem.hasMultipleRoles && (
                            <MultiRoleBadge count={userItem.allRoles.length} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={userItem.role}
                          onValueChange={(value: AppRole) =>
                            onRoleChange(userItem.user_id, userItem.role, value)
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-primary"
                          onClick={() => handleResetPassword(userItem.email || "", userItem.id)}
                          disabled={resettingId === userItem.id}
                        >
                          {resettingId === userItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Reset PW</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
