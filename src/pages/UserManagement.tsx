import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, History, ShieldAlert, Loader2, Activity, Download, UserCog, Shield, UserPlus } from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { useUsersWithRoles, useRoleChangeAudit, useUpdateUserRole, AppRole, roleConfig } from "@/hooks/useUsersWithRoles";
import { UsersTable, AuditLogTable, PermissionsTab, InvitationsTab } from "@/components/users";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { format, formatDistanceToNow } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const UserManagement = () => {
  useAdminRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "users";
  const [searchQuery, setSearchQuery] = useState("");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>("all");
  const [auditDateFilter, setAuditDateFilter] = useState<string>("all");
  const { isAdmin, isLoading: isLoadingRole } = useIsAdmin();

  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<AppRole>("staff");

  const { data: users, isLoading: isLoadingUsers } = useUsersWithRoles(isAdmin);
  const { data: auditLogs, isLoading: isLoadingAudit } = useRoleChangeAudit(isAdmin);
  const updateRole = useUpdateUserRole();

  const handleRoleChange = (userId: string, oldRole: AppRole, newRole: AppRole) => {
    updateRole.mutate({ userId, oldRole, newRole });
  };

  const handleBulkRoleChange = () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }
    
    let successCount = 0;
    selectedUsers.forEach(userId => {
      const user = users?.find(u => u.user_id === userId);
      if (user && user.role !== bulkRole) {
        updateRole.mutate({ userId, oldRole: user.role, newRole: bulkRole }, {
          onSuccess: () => successCount++
        });
      }
    });
    
    toast.success(`Bulk role update initiated for ${selectedUsers.length} users`);
    setSelectedUsers([]);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && users) {
      setSelectedUsers(users.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const exportUsersToExcel = () => {
    if (!users || users.length === 0) {
      toast.error("No users to export");
      return;
    }

    const data = users.map(user => ({
      "Email": user.email || "-",
      "First Name": user.first_name || "-",
      "Last Name": user.last_name || "-",
      "Role": roleConfig[user.role].label,
      "Multiple Roles": user.hasMultipleRoles ? "Yes" : "No",
      "All Roles": user.allRoles.join(", "),
      "Created At": user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy HH:mm") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `users-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Users exported successfully");
  };

  if (isLoadingRole) {
    return (
      <MainLayout title="User Management" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin && !import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout fixedHeight title="User Management" subtitle="Manage user roles and permissions (Admin only)">
      <ErrorBoundary>
        <div className="flex flex-col h-full overflow-hidden">
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex-shrink-0 mx-4 sm:mx-6 mt-4">
          <ShieldAlert className="h-4 w-4" />
          <span>You are viewing admin-only settings. Role changes take effect immediately.</span>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-6">
          <div className="overflow-x-auto pb-1 scrollbar-hide px-4 sm:px-6">
            <TabsList>
              <TabsTrigger value="users" className="gap-2 whitespace-nowrap">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2 whitespace-nowrap">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2 whitespace-nowrap">
                <UserCog className="h-4 w-4" />
                Bulk Actions
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2 whitespace-nowrap">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2 whitespace-nowrap">
                <UserPlus className="h-4 w-4" />
                Invitations
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 whitespace-nowrap">
                <History className="h-4 w-4" />
                Audit Log
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
          <TabsContent value="users" className="mt-0 focus-visible:outline-none">
            <div className="flex justify-end mb-4">
              <Button variant="outline" onClick={exportUsersToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </Button>
            </div>
            <UsersTable
              users={users}
              isLoading={isLoadingUsers}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRoleChange={handleRoleChange}
              isUpdating={updateRole.isPending}
            />
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  User Activity Summary
                </CardTitle>
                <CardDescription>Last activity and session information for all users</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Account Created</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Account Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.first_name} {user.last_name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleConfig[user.role].color}>
                              {roleConfig[user.role].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : "-"}
                          </TableCell>
                          <TableCell>
                            {user.created_at ? formatDistanceToNow(new Date(user.created_at)) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Bulk Role Assignment
                </CardTitle>
                <CardDescription>Select multiple users to change their roles at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as AppRole)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkRoleChange} 
                    disabled={selectedUsers.length === 0 || updateRole.isPending}
                  >
                    {updateRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Apply to {selectedUsers.length} Selected
                  </Button>
                </div>

                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedUsers.length === users?.length && users.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedUsers.includes(user.user_id)}
                              onCheckedChange={(checked) => handleSelectUser(user.user_id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleConfig[user.role].color}>
                              {roleConfig[user.role].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsTab />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationsTab />
          </TabsContent>

          <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
            <AuditLogTable
              logs={auditLogs}
              isLoading={isLoadingAudit}
              searchQuery={auditSearchQuery}
              roleFilter={auditRoleFilter}
              dateFilter={auditDateFilter}
              onSearchChange={setAuditSearchQuery}
              onRoleFilterChange={setAuditRoleFilter}
              onDateFilterChange={setAuditDateFilter}
            />
          </TabsContent>
          </div>
        </Tabs>
        </div>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default UserManagement;
