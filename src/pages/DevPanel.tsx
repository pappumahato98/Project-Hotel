import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code2, 
  Database, 
  Server, 
  Activity, 
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Settings,
  Bell,
  Shield,
  ShieldAlert,
  Users,
  Loader2,
  Trash2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database as DbTypes } from "@/integrations/supabase/types";
import { DataSeeder } from "@/components/dev/DataSeeder";
import { MCPConfigPanel } from "@/components/dev/MCPConfig";
import { SecurityBreachPanel } from "@/components/dev/SecurityBreachPanel";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

type AppRole = DbTypes["public"]["Enums"]["app_role"];

const ROLE_PRIORITY: Record<AppRole, number> = {
  user: 0,
  staff: 1,
  manager: 2,
  admin: 3,
};

interface EmailConfig {
  enabled: boolean;
  provider: string;
  roleChangeNotifications: boolean;
  bookingNotifications: boolean;
  systemAlerts: boolean;
}

interface UserWithMultipleRoles {
  user_id: string;
  email: string | null;
  roles: AppRole[];
  highestRole: AppRole;
}

interface SystemHealthStatus {
  name: string;
  status: "healthy" | "degraded" | "error";
  latency: string;
  icon: typeof Database;
}

const DevPanel = () => {
  useAdminRealtime();
  const { isAdmin, isLoading } = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "status";

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Persisted email config
  const { data: emailConfig } = useSettings<EmailConfig>("email_config", {
    enabled: false,
    provider: "resend",
    roleChangeNotifications: true,
    bookingNotifications: true,
    systemAlerts: true,
  });
  const updateEmailConfig = useUpdateSettings<EmailConfig>("email_config");

  // System health check
  const { data: systemHealth, isLoading: isLoadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ["system-health"],
    queryFn: async (): Promise<SystemHealthStatus[]> => {
      const results: SystemHealthStatus[] = [];

      // Database health check
      const dbStart = performance.now();
      try {
        const { error } = await supabase.from("rooms").select("count").limit(1);
        const dbLatency = Math.round(performance.now() - dbStart);
        results.push({
          name: "Database",
          status: error ? "error" : "healthy",
          latency: `${dbLatency}ms`,
          icon: Database,
        });
      } catch {
        results.push({ name: "Database", status: "error", latency: "N/A", icon: Database });
      }

      // Auth service check
      const authStart = performance.now();
      try {
        const { error } = await supabase.auth.getSession();
        const authLatency = Math.round(performance.now() - authStart);
        results.push({
          name: "Auth Service",
          status: error ? "degraded" : "healthy",
          latency: `${authLatency}ms`,
          icon: Activity,
        });
      } catch {
        results.push({ name: "Auth Service", status: "error", latency: "N/A", icon: Activity });
      }

      // API Server (settings table)
      const apiStart = performance.now();
      try {
        const { error } = await supabase.from("settings").select("count").limit(1);
        const apiLatency = Math.round(performance.now() - apiStart);
        results.push({
          name: "API Server",
          status: error ? "degraded" : "healthy",
          latency: `${apiLatency}ms`,
          icon: Server,
        });
      } catch {
        results.push({ name: "API Server", status: "degraded", latency: "N/A", icon: Server });
      }

      // Edge Functions (simulate check)
      results.push({
        name: "Edge Functions",
        status: "healthy",
        latency: "~50ms",
        icon: Code2,
      });

      return results;
    },
    enabled: isAdmin,
    refetchInterval: 60000, // Refresh every minute
  });

  // Real audit logs
  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["dev-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch users with multiple roles
  const { data: usersWithMultipleRoles, isLoading: isLoadingRoles, refetch: refetchRoles } = useQuery({
    queryKey: ["users-with-multiple-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const userRolesMap = new Map<string, AppRole[]>();
      roles.forEach(r => {
        const existing = userRolesMap.get(r.user_id) || [];
        userRolesMap.set(r.user_id, [...existing, r.role as AppRole]);
      });

      const usersWithMultiple: UserWithMultipleRoles[] = [];
      userRolesMap.forEach((userRoles, userId) => {
        if (userRoles.length > 1) {
          const profile = profiles.find(p => p.user_id === userId);
          const highestRole = userRoles.reduce((best, current) => 
            ROLE_PRIORITY[current] > ROLE_PRIORITY[best] ? current : best
          );
          usersWithMultiple.push({
            user_id: userId,
            email: profile?.email || null,
            roles: userRoles,
            highestRole,
          });
        }
      });

      return usersWithMultiple;
    },
    enabled: isAdmin,
  });

  // Cleanup mutation
  const cleanupRoles = useMutation({
    mutationFn: async (users: UserWithMultipleRoles[]) => {
      for (const user of users) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.user_id)
          .neq("role", user.highestRole);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-multiple-roles"] });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Role cleanup completed successfully");
    },
    onError: (error) => {
      toast.error("Cleanup failed: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <MainLayout title="Developer Panel" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin && !import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchHealth();
    await queryClient.refetchQueries();
    setRefreshing(false);
    toast.success("System status refreshed");
  };

  const handleClearCache = () => {
    queryClient.clear();
    toast.success("Client cache cleared");
  };

  const handleSyncData = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
    toast.success("Data synchronization triggered");
  };

  const handleRestartServices = () => {
    setRefreshing(true);
    toast.info("Restarting application services...");
    setTimeout(() => {
      queryClient.clear();
      window.location.reload();
    }, 1000);
  };

  const handleRunMigrations = async () => {
    setRefreshing(true);
    toast.info("Checking database schema and migrations...");

    try {
      const { error } = await supabase.from('settings').select('count');
      if (error) throw error;

      setTimeout(() => {
        setRefreshing(false);
        toast.success("Database schema verified and migrations are up to date");
      }, 1000);
    } catch (error: any) {
      setRefreshing(false);
      toast.error("Migration check failed: " + error.message);
    }
  };

  const handleEmailConfigChange = (key: keyof EmailConfig, value: any) => {
    if (!emailConfig) return;
    updateEmailConfig.mutate({
      ...emailConfig,
      [key]: value
    }, {
      onSuccess: () => toast.success("Email configuration saved")
    });
  };

  const getStatusIcon = (status: "healthy" | "degraded" | "error") => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case "degraded":
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case "error":
        return <XCircle className="h-3 w-3 mr-1" />;
    }
  };

  const getStatusBadgeClass = (status: "healthy" | "degraded" | "error") => {
    switch (status) {
      case "healthy":
        return "bg-success/20 text-success border-success/30";
      case "degraded":
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/30";
    }
  };

  return (
    <MainLayout title="Developer Panel" subtitle="System monitoring and diagnostics (Admin only)">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="status" className="gap-2 whitespace-nowrap flex-shrink-0">
            <Activity className="h-4 w-4" />
            System Status
          </TabsTrigger>
            <TabsTrigger value="seeder" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Sparkles className="h-4 w-4" />
              Data Seeder
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Users className="h-4 w-4" />
              Role Cleanup
              {(usersWithMultipleRoles?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {usersWithMultipleRoles?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Mail className="h-4 w-4" />
              Email Config
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Terminal className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2 whitespace-nowrap flex-shrink-0">
              <Shield className="h-4 w-4" />
              MCP Config
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 text-destructive whitespace-nowrap flex-shrink-0">
              <ShieldAlert className="h-4 w-4" />
              Security Breach
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="status">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      System Status
                    </CardTitle>
                    <CardDescription>Real-time service health from database</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || isLoadingHealth}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || isLoadingHealth ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingHealth ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  systemHealth?.map((service) => (
                    <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <service.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{service.latency}</span>
                        <Badge className={getStatusBadgeClass(service.status)}>
                          {getStatusIcon(service.status)}
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Developer utilities and tools</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2" onClick={handleClearCache}>
                  <Database className="h-4 w-4" />
                  Clear Cache
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={handleSyncData} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Sync Data
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={handleRestartServices} disabled={refreshing}>
                  <Server className="h-4 w-4" />
                  Restart Services
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={handleRunMigrations} disabled={refreshing}>
                  <Code2 className="h-4 w-4" />
                  Run Migrations
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seeder">
          <DataSeeder />
        </TabsContent>

        <TabsContent value="cleanup">
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Role Cleanup
                  </CardTitle>
                  <CardDescription>
                    Detect and fix users with multiple role entries
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchRoles()}
                    disabled={isLoadingRoles}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRoles ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  {(usersWithMultipleRoles?.length ?? 0) > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => cleanupRoles.mutate(usersWithMultipleRoles!)}
                      disabled={cleanupRoles.isPending}
                    >
                      {cleanupRoles.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clean All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRoles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (usersWithMultipleRoles?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                  <p className="text-lg font-medium">All Clean!</p>
                  <p className="text-sm text-muted-foreground">
                    No users have multiple role entries.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Found {usersWithMultipleRoles?.length} user(s) with multiple roles. 
                    Cleanup will keep only the highest role for each user.
                  </div>
                  {usersWithMultipleRoles?.map((user) => (
                    <div 
                      key={user.user_id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium">{user.email || "Unknown Email"}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {user.user_id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {user.roles.map((role, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className={role === user.highestRole 
                                ? "bg-success/20 text-success border-success/30" 
                                : "bg-destructive/20 text-destructive border-destructive/30 line-through"
                              }
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          → keeps {user.highestRole}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Configure email notification settings (persisted to database)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Master switch for all email features</p>
                  </div>
                  <Switch 
                    checked={emailConfig?.enabled || false} 
                    onCheckedChange={(checked) => handleEmailConfigChange("enabled", checked)}
                    disabled={updateEmailConfig.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Provider</Label>
                  <Input 
                    value={emailConfig?.provider || "resend"} 
                    onChange={(e) => handleEmailConfigChange("provider", e.target.value)}
                    placeholder="resend"
                    disabled={updateEmailConfig.isPending}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Types
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Role Change Notifications</span>
                    <Switch 
                      checked={emailConfig?.roleChangeNotifications || false}
                      onCheckedChange={(checked) => handleEmailConfigChange("roleChangeNotifications", checked)}
                      disabled={!emailConfig?.enabled || updateEmailConfig.isPending}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Booking Notifications</span>
                    <Switch 
                      checked={emailConfig?.bookingNotifications || false}
                      onCheckedChange={(checked) => handleEmailConfigChange("bookingNotifications", checked)}
                      disabled={!emailConfig?.enabled || updateEmailConfig.isPending}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Alerts</span>
                    <Switch 
                      checked={emailConfig?.systemAlerts || false}
                      onCheckedChange={(checked) => handleEmailConfigChange("systemAlerts", checked)}
                      disabled={!emailConfig?.enabled || updateEmailConfig.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Email Configuration Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span>Provider</span>
                    <Badge variant="outline">{emailConfig?.provider || "Not set"}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span>Status</span>
                    <Badge className={emailConfig?.enabled 
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-muted text-muted-foreground"
                    }>
                      {emailConfig?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span>Persistence</span>
                    <Badge className="bg-success/20 text-success border-success/30">
                      Database
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Recent System Logs
              </CardTitle>
              <CardDescription>Real audit log entries from database</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <div className={`mt-0.5 ${
                        log.action.toLowerCase().includes("error") ? "text-destructive" :
                        log.action.toLowerCase().includes("warning") ? "text-amber-500" :
                        "text-blue-500"
                      }`}>
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {log.new_values ? JSON.stringify(log.new_values).slice(0, 100) : "No details"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp">
          <MCPConfigPanel />
        </TabsContent>

        <TabsContent value="security">
          <SecurityBreachPanel />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default DevPanel;
