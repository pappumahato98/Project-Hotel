import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  Settings,
  Lock,
  Eye,
  Zap,
  Activity,
  UserPlus,
  Key,
  Database,
  Terminal,
  FileText,
  AlertTriangle,
  Globe,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Layout,
  Hotel,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { SecurityBreachPanel } from "@/components/dev/SecurityBreachPanel";
import { SSLSecurityDashboard } from "@/components/security/SSLSecurityDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateSettings, useSettings, useAPIKeysSettings, useUpdateAPIKeysSettings, APIKey } from "@/hooks/useSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import {
  useUsersWithRoles,
  useAdminAuditLogs,
  useRolePermissions,
  useUpdateUserRole,
  useOTAChannels,
  useOTASyncLogs,
  useUpdateRolePermission,
  useUpdateOTAChannel,
  AppRole
} from "@/hooks/useUsersWithRoles";
import { UsersTable } from "@/components/users/UsersTable";
import { GeneralAuditLogTable } from "@/components/users/GeneralAuditLogTable";
import { TableSkeleton } from "@/components/skeletons";
import { DesignSystemTab } from "@/components/admin/design-system/DesignSystemTab";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { formatCurrency } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import { useReservations } from "@/hooks/useReservations";
import { useDashboardStats } from "@/hooks/useDashboardStats";

// Security policy interface
interface SecurityPolicies {
  force_mfa: boolean;
  session_timeout_hours: number;
  password_policy: "basic" | "standard" | "strong";
}

const AdminConsole = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };
  const [isExporting, setIsExporting] = useState(false);

  // Realtime hook
  useAdminRealtime();

  // State for modals
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: "", firstName: "", lastName: "", role: "staff" as AppRole });
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Data hooks
  const { data: users, isLoading: loadingUsers } = useUsersWithRoles(activeTab === "users" || activeTab === "overview");
  const { data: adminLogs, isLoading: loadingLogs } = useAdminAuditLogs(activeTab === "audit" || activeTab === "overview");
  const { data: permissions, isLoading: loadingPerms } = useRolePermissions(activeTab === "permissions");
  const { data: otaChannels, isLoading: loadingChannels } = useOTAChannels(activeTab === "integrations");
  const { data: otaLogs, isLoading: loadingOTALogs } = useOTASyncLogs(activeTab === "integrations");
  const { data: apiKeysSettings, isLoading: loadingAPIKeys } = useAPIKeysSettings();
  const updateAPIKeys = useUpdateAPIKeysSettings();

  // System metrics hooks
  const { data: rooms } = useRooms();
  const { reservations } = useReservations();
  const { data: dashboardStats } = useDashboardStats();

  // Security policies state (persisted)
  const { data: securityPolicies } = useSettings<SecurityPolicies>("security_policies", {
    force_mfa: false,
    session_timeout_hours: 4,
    password_policy: "standard"
  });
  const updateSecurityPolicies = useUpdateSettings<SecurityPolicies>("security_policies");

  // State for RBAC
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({ role: "staff" as AppRole, permission: "" });

  const updateUserRole = useUpdateUserRole();
  const updatePermission = useUpdateRolePermission();
  const updateOTAChannel = useUpdateOTAChannel();

  const { data: lockdownEnabled } = useSettings<boolean>("system_lockdown", false);
  const updateSettings = useUpdateSettings<boolean>("system_lockdown");

  const handleExportLogs = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info("No logs found to export");
        return;
      }

      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(log =>
        Object.values(log).map(val =>
          typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${String(val).replace(/"/g, '""')}"`
        ).join(",")
      );
      const csv = [headers, ...rows].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Logs exported successfully");
    } catch (error: any) {
      toast.error("Failed to export logs: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSystemLockdown = () => {
    const newState = !lockdownEnabled;
    updateSettings.mutate(newState, {
      onSuccess: () => {
        toast.success(`System lockdown ${newState ? "enabled" : "disabled"}`);
      }
    });
  };

  const handleProvisionAccount = async () => {
    if (!newUserData.email) {
      toast.error("Email is required");
      return;
    }
    setIsProvisioning(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          email: newUserData.email,
          first_name: newUserData.firstName,
          last_name: newUserData.lastName,
          user_id: crypto.randomUUID(),
        })
        .select()
        .single();

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: profile.user_id,
          role: newUserData.role,
        });

      if (roleError) throw roleError;

      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Profile pre-provisioned. User must sign up with this email to activate.");
      setProvisionModalOpen(false);
      setNewUserData({ email: "", firstName: "", lastName: "", role: "staff" });
    } catch (error: any) {
      toast.error("Failed to provision account: " + error.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleSyncChannel = (id: string) => {
    updateOTAChannel.mutate({ id, sync_status: "Synchronizing..." });
    setTimeout(() => {
      updateOTAChannel.mutate({ id, sync_status: "Last sync: Just now" });
    }, 2000);
  };

  const handleAddAPIKey = () => {
    const newKey: APIKey = {
      name: "New API Key",
      key: `sk_${Math.random().toString(36).substr(2, 24)}`,
      is_secret: true,
      description: "Auto-generated system key"
    };
    const currentKeys = apiKeysSettings?.keys || [];
    updateAPIKeys.mutate({ keys: [...currentKeys, newKey] });
  };

  const handleDeleteAPIKey = (keyName: string) => {
    const currentKeys = apiKeysSettings?.keys || [];
    updateAPIKeys.mutate({ keys: currentKeys.filter(k => k.name !== keyName) });
  };

  const handleAddPermission = () => {
    if (!newPermission.permission) {
      toast.error("Permission name is required");
      return;
    }
    updatePermission.mutate({
      role: newPermission.role,
      permission: newPermission.permission,
      action: 'add'
    }, {
      onSuccess: () => {
        setRbacModalOpen(false);
        setNewPermission({ ...newPermission, permission: "" });
      }
    });
  };

  const handleSecurityPolicyChange = (key: keyof SecurityPolicies, value: any) => {
    if (!securityPolicies) return;
    updateSecurityPolicies.mutate({
      ...securityPolicies,
      [key]: value
    }, {
      onSuccess: () => toast.success("Security policy updated")
    });
  };

  if (!mounted || loadingAdmin) {
    return (
      <MainLayout title="Admin Console" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin && !import.meta.env.DEV) return <Navigate to="/" replace />;

  return (
    <MainLayout fixedHeight title="Admin Console" subtitle="System-wide administrative controls and security">
      <ErrorBoundary>
      <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-hide px-4 sm:px-6 mt-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2 whitespace-nowrap flex-shrink-0">
            <Activity className="h-4 w-4" />
            System Overview
          </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Users className="h-4 w-4" />
              Account Management
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Lock className="h-4 w-4" />
              Security Policies
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Shield className="h-4 w-4" />
              RBAC
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Terminal className="h-4 w-4" />
              Audit Trails
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Globe className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="design_system" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Layout className="h-4 w-4" />
              Design System
            </TabsTrigger>
            <TabsTrigger value="ssl_security" className="gap-2 text-emerald-500 whitespace-nowrap flex-shrink-0">
              <ShieldCheck className="h-4 w-4" />
              SSL/TLS Security
            </TabsTrigger>
            <TabsTrigger value="security_breach" className="gap-2 text-destructive whitespace-nowrap flex-shrink-0">
              <ShieldAlert className="h-4 w-4" />
              Security Breach
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-blue-500" />
                  Total Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rooms?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Property inventory</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-success" />
                  Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reservations?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total bookings</p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-warning" />
                  Today's Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.todayRevenue || "NPR 0"}</div>
                <p className="text-xs text-muted-foreground mt-1">Today's earnings</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Quick Administrative Actions</CardTitle>
                <CardDescription>Common tasks for system administrators</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => setProvisionModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Provision Account
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => handleTabChange("integrations")}
                >
                  <Key className="h-4 w-4" />
                  Rotate API Keys
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={handleExportLogs}
                  disabled={isExporting}
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Export Logs
                </Button>
                <Button
                  variant={lockdownEnabled ? "destructive" : "outline"}
                  className={`justify-start gap-2 ${!lockdownEnabled && 'text-destructive hover:text-destructive'}`}
                  onClick={handleSystemLockdown}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {lockdownEnabled ? "End Lockdown" : "System Lockdown"}
                </Button>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Recent Administrative Activity</CardTitle>
                <CardDescription>Security and configuration changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingLogs ? (
                    <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                  ) : adminLogs?.slice(0, 5).map((log, i) => (
                    <div key={log.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium">{log.action}</span>
                        <p className="text-xs text-muted-foreground">{log.user_email} → {log.entity_type}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "HH:mm")}</span>
                    </div>
                  ))}
                  {(!adminLogs || adminLogs.length === 0) && !loadingLogs && (
                    <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UsersTable
            users={users}
            isLoading={loadingUsers}
            searchQuery=""
            onSearchChange={() => {}}
            onRoleChange={(userId, oldRole, newRole) => updateUserRole.mutate({ userId, oldRole, newRole })}
            isUpdating={updateUserRole.isPending}
          />
        </TabsContent>

        <TabsContent value="security">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Global Security Policies</CardTitle>
              <CardDescription>Configure system-wide authentication and access rules. Changes are saved automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Force Multi-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Require 2FA for all staff members</p>
                  </div>
                  <Switch
                    checked={securityPolicies?.force_mfa || false}
                    onCheckedChange={(checked) => handleSecurityPolicyChange("force_mfa", checked)}
                    disabled={updateSecurityPolicies.isPending}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">Automatically logout after inactivity</p>
                  </div>
                  <Select 
                    value={String(securityPolicies?.session_timeout_hours || 4)}
                    onValueChange={(v) => handleSecurityPolicyChange("session_timeout_hours", parseInt(v))}
                    disabled={updateSecurityPolicies.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Hour</SelectItem>
                      <SelectItem value="2">2 Hours</SelectItem>
                      <SelectItem value="4">4 Hours</SelectItem>
                      <SelectItem value="8">8 Hours</SelectItem>
                      <SelectItem value="24">24 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Password Policy</p>
                    <p className="text-sm text-muted-foreground">Minimum length and complexity requirements</p>
                  </div>
                  <Select 
                    value={securityPolicies?.password_policy || "standard"}
                    onValueChange={(v) => handleSecurityPolicyChange("password_policy", v)}
                    disabled={updateSecurityPolicies.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="strong">Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Role-Based Access Control</CardTitle>
                  <CardDescription>Manage permissions for each user role</CardDescription>
                </div>
                <Button onClick={() => setRbacModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Permission
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPerms ? (
                <TableSkeleton rows={5} />
              ) : permissions && permissions.length > 0 ? (
                <div className="space-y-2">
                  {permissions.map((perm: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{perm.role}</Badge>
                        <span>{perm.permission}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePermission.mutate({ role: perm.role, permission: perm.permission, action: 'remove' })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No custom permissions configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <GeneralAuditLogTable logs={adminLogs || []} isLoading={loadingLogs} />
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      OTA Channels
                    </CardTitle>
                    <CardDescription>Connected online travel agencies</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingChannels ? (
                  <TableSkeleton rows={3} />
                ) : otaChannels && otaChannels.length > 0 ? (
                  <div className="space-y-3">
                    {otaChannels.map((channel: any) => (
                      <div key={channel.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <Badge variant={channel.is_active ? "default" : "secondary"}>
                            {channel.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="font-medium">{channel.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{channel.sync_status}</span>
                          <Button variant="outline" size="sm" onClick={() => handleSyncChannel(channel.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No OTA channels configured</p>
                )}
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      API Keys
                    </CardTitle>
                    <CardDescription>Manage system API keys</CardDescription>
                  </div>
                  <Button onClick={handleAddAPIKey} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAPIKeys ? (
                  <TableSkeleton rows={2} />
                ) : apiKeysSettings?.keys && apiKeysSettings.keys.length > 0 ? (
                  <div className="space-y-3">
                    {apiKeysSettings.keys.map((key, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {key.is_secret ? `${key.key.slice(0, 10)}${"*".repeat(20)}` : key.key}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAPIKey(key.name)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No API keys configured</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design_system">
          <DesignSystemTab />
        </TabsContent>

        <TabsContent value="ssl_security" className="mt-0 focus-visible:outline-none">
          <SSLSecurityDashboard />
        </TabsContent>

        <TabsContent value="security_breach" className="mt-0 focus-visible:outline-none">
          <SecurityBreachPanel />
        </TabsContent>
        </div>
      </Tabs>
      </div>

      {/* Provision Account Modal */}
      <Dialog open={provisionModalOpen} onOpenChange={setProvisionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision New Account</DialogTitle>
            <DialogDescription>
              Pre-register an account. The user must sign up with the same email to activate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Role</Label>
              <Select value={newUserData.role} onValueChange={(v) => setNewUserData({ ...newUserData, role: v as AppRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisionModalOpen(false)}>Cancel</Button>
            <Button onClick={handleProvisionAccount} disabled={isProvisioning}>
              {isProvisioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Provision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Permission Modal */}
      <Dialog open={rbacModalOpen} onOpenChange={setRbacModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Permission</DialogTitle>
            <DialogDescription>
              Assign a new permission to a role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newPermission.role} onValueChange={(v) => setNewPermission({ ...newPermission, role: v as AppRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permission</Label>
              <Input
                value={newPermission.permission}
                onChange={(e) => setNewPermission({ ...newPermission, permission: e.target.value })}
                placeholder="e.g., manage_reservations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRbacModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPermission} disabled={updatePermission.isPending}>
              {updatePermission.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default AdminConsole;
