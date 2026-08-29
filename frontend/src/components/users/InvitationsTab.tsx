import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { UserPlus, Loader2, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUsersWithRoles";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function InvitationsTab() {
  const [newUserData, setNewUserData] = useState({ email: "", firstName: "", lastName: "", role: "staff" as AppRole });
  const [isProvisioning, setIsProvisioning] = useState(false);
  const queryClient = useQueryClient();

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
      setNewUserData({ email: "", firstName: "", lastName: "", role: "staff" });
    } catch (error: any) {
      toast.error("Failed to provision account: " + error.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Invitations
        </CardTitle>
        <CardDescription>Pre-provision user accounts by email</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={newUserData.firstName}
                onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={newUserData.lastName}
                onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="user@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Role</Label>
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

          <div className="pt-4">
            <Button
              onClick={handleProvisionAccount}
              disabled={isProvisioning}
              className="w-full sm:w-auto gap-2"
              variant="blue"
            >
              {isProvisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Send Invitation & Provision
            </Button>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Security Note</p>
                <p className="text-muted-foreground mt-1">
                  Provisioning an account creates a profile and assigns roles immediately. The user will be able to access the system as soon as they complete the sign-up process with the specified email address.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
