import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, Lock, Eye, Pencil, Trash2, FileText, Loader2,
  ChevronDown, Check, Settings2, User, Layout, ChevronRight
} from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { navItems, operationsNavItems, adminNavItems } from "@/config/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUsersWithRoles } from "@/hooks/useUsersWithRoles";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ModulePermission {
  view: boolean;
  write: boolean;
  delete: boolean;
  report: boolean;
  enabled: boolean;
}

export interface UserRolesSettingsData {
  modules: Record<string, ModulePermission>;
  global_enabled: boolean;
}

const allModules = [...navItems, ...operationsNavItems, ...adminNavItems];

const defaultPermissions: UserRolesSettingsData = {
  global_enabled: true,
  modules: allModules.reduce((acc, item) => {
    acc[item.label] = {
      view: true,
      write: true,
      delete: true,
      report: true,
      enabled: true,
    };
    return acc;
  }, {} as Record<string, ModulePermission>),
};

export function UserRolesSettings() {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedModuleLabel, setSelectedModuleLabel] = useState<string>("all");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const { data: users = [], isLoading: isLoadingUsers } = useUsersWithRoles();
  const { data: settings, isLoading: isLoadingSettings } = useSettings<UserRolesSettingsData>("user_roles_permissions", defaultPermissions);
  const updateSettings = useUpdateSettings<UserRolesSettingsData>("user_roles_permissions");

  const toggleModuleExpansion = (label: string) => {
    setExpandedModules(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleGlobalToggle = (enabled: boolean) => {
    if (!settings) return;
    const newModules = { ...settings.modules };
    Object.keys(newModules).forEach(key => {
      newModules[key] = { ...newModules[key], enabled };
    });
    updateSettings.mutate({ ...settings, global_enabled: enabled, modules: newModules });
  };

  const handleModuleToggle = (moduleLabel: string, enabled: boolean) => {
    if (!settings) return;
    const newModules = { ...settings.modules };
    newModules[moduleLabel] = { ...newModules[moduleLabel], enabled };
    updateSettings.mutate({ ...settings, modules: newModules });
  };

  const handlePermissionToggle = (moduleLabel: string, permission: keyof Omit<ModulePermission, 'enabled'>, value: boolean) => {
    if (!settings) return;
    const newModules = { ...settings.modules };
    newModules[moduleLabel] = { ...newModules[moduleLabel], [permission]: value };
    updateSettings.mutate({ ...settings, modules: newModules });
  };

  if (isLoadingSettings || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedUser = users.find(u => u.user_id === selectedUserId);
  const filteredModules = allModules.filter(m =>
    selectedModuleLabel === "all" || m.label === selectedModuleLabel
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> User & Roles Management
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure granular access control and module visibility.
          </p>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Target User / Role</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-11 bg-background shadow-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">
                    {selectedUserId === "all" ? "Apply to All Users" : `${selectedUser?.first_name} ${selectedUser?.last_name}`}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] max-h-[300px] overflow-y-auto">
               <DropdownMenuItem onClick={() => setSelectedUserId("all")}>All Users (Global Config)</DropdownMenuItem>
               {users.map(u => (
                 <DropdownMenuItem key={u.user_id} onClick={() => setSelectedUserId(u.user_id)}>
                    <div className="flex flex-col">
                       <span className="font-bold">{u.first_name} {u.last_name}</span>
                       <span className="text-[10px] text-muted-foreground uppercase">{u.role}</span>
                    </div>
                 </DropdownMenuItem>
               ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Module Filter</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-11 bg-background shadow-sm">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">
                    {selectedModuleLabel === "all" ? "All Application Modules" : selectedModuleLabel}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] max-h-[300px] overflow-y-auto">
               <DropdownMenuItem onClick={() => setSelectedModuleLabel("all")}>All Modules</DropdownMenuItem>
               {allModules.map(m => (
                 <DropdownMenuItem key={m.label} onClick={() => setSelectedModuleLabel(m.label)}>
                    <div className="flex items-center gap-2">
                       <m.icon className="h-3.5 w-3.5" />
                       <span>{m.label}</span>
                    </div>
                 </DropdownMenuItem>
               ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card variant="elevated">
        <CardHeader className="border-b bg-muted/20 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-4 w-4" />
              <CardTitle className="text-xs font-bold uppercase tracking-widest">Access Permission Matrix</CardTitle>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-bold text-muted-foreground uppercase">Enable All</span>
               <Switch checked={settings?.global_enabled} onCheckedChange={handleGlobalToggle} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px]"></TableHead>
                <TableHead className="w-[200px] text-[11px] font-bold uppercase">Module / Feature</TableHead>
                <TableHead className="text-center text-[11px] font-bold uppercase">Status</TableHead>
                <TableHead className="text-center text-[11px] font-bold uppercase px-4">Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModules.map((module) => {
                const perms = settings?.modules[module.label] || { view: true, write: true, delete: true, report: true, enabled: true };
                const isExpanded = expandedModules.includes(module.label);

                return (
                  <Collapsible
                    key={module.label}
                    open={isExpanded}
                    onOpenChange={() => toggleModuleExpansion(module.label)}
                    asChild
                  >
                    <>
                      <TableRow className="hover:bg-muted/10 transition-colors group">
                        <TableCell>
                           <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md group-hover:bg-background group-hover:shadow-sm">
                                 <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-90")} />
                              </Button>
                           </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                              <module.icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                               <p className="font-bold text-[13px]">{module.label}</p>
                               <p className="text-[10px] text-muted-foreground font-normal">{module.path}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <Switch
                              checked={perms.enabled}
                              onCheckedChange={(v) => handleModuleToggle(module.label, v)}
                           />
                        </TableCell>
                        <TableCell className="px-4">
                           <div className="flex items-center justify-center gap-6">
                              {[
                                 { id: 'view' as const, label: 'View', icon: Eye },
                                 { id: 'write' as const, label: 'Write', icon: Pencil },
                                 { id: 'delete' as const, label: 'Delete', icon: Trash2 },
                                 { id: 'report' as const, label: 'Report', icon: FileText },
                              ].map(p => (
                                 <div key={p.id} className="flex flex-col items-center gap-1.5 group/p">
                                    <Checkbox
                                       checked={perms[p.id]}
                                       disabled={!perms.enabled}
                                       onCheckedChange={(v) => handlePermissionToggle(module.label, p.id, !!v)}
                                       className="h-4 w-4"
                                    />
                                    <span className="text-[9px] font-bold uppercase text-muted-foreground group-hover/p:text-primary transition-colors">
                                       {p.label}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                         <TableRow className="bg-muted/5 hover:bg-muted/5 border-l-2 border-l-primary/30">
                            <TableCell colSpan={4} className="p-0">
                               <div className="px-14 py-4 space-y-3">
                                  <p className="text-[10px] font-bold uppercase text-primary/70 tracking-widest mb-2">Module-Specific Features</p>
                                  <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                                     {(module.subItems || []).map(sub => (
                                        <div key={sub.label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                                           <div className="flex items-center gap-2">
                                              <div className="h-1 w-1 rounded-full bg-primary/40" />
                                              <span className="text-xs font-semibold">{sub.label}</span>
                                           </div>
                                           <div className="flex items-center gap-4">
                                              <Checkbox checked={perms.view} disabled={!perms.enabled} className="h-3.5 w-3.5" />
                                              <Checkbox checked={perms.write} disabled={!perms.enabled} className="h-3.5 w-3.5" />
                                           </div>
                                        </div>
                                     ))}
                                     {(module.subItems || []).length === 0 && (
                                        <p className="text-[11px] text-muted-foreground italic">No specific features available for customization in this version.</p>
                                     )}
                                  </div>
                               </div>
                            </TableCell>
                         </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
