import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Shield } from "lucide-react";
import { useRolePermissions, useUpdateRolePermission, AppRole } from "@/hooks/useUsersWithRoles";
import { TableSkeleton } from "@/components/skeletons";
import { useState } from "react";
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
import { toast } from "sonner";

export function PermissionsTab() {
  const { data: permissions, isLoading: loadingPerms } = useRolePermissions(true);
  const updatePermission = useUpdateRolePermission();
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({ role: "staff" as AppRole, permission: "" });

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

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role-Based Access Control
            </CardTitle>
            <CardDescription>Manage permissions for each user role</CardDescription>
          </div>
          <Button onClick={() => setRbacModalOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
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
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/5">{perm.role}</Badge>
                  <span className="font-medium">{perm.permission}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => updatePermission.mutate({ role: perm.role, permission: perm.permission, action: 'remove' })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <Shield className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No custom permissions configured</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setRbacModalOpen(true)}>
              Initialize Permissions
            </Button>
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
