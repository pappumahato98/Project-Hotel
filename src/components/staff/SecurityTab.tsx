import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Smartphone, Eye, EyeOff, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { trackActivity } from "@/utils/auditLogger";

export const SecurityTab = () => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [loading, setLoading] = useState(false);

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(passwords.new);
  const strengthColor = strength <= 25 ? "bg-destructive" : strength <= 50 ? "bg-amber-500" : strength <= 75 ? "bg-blue-500" : "bg-success";
  const strengthText = strength <= 25 ? "Weak" : strength <= 50 ? "Fair" : strength <= 75 ? "Good" : "Strong";

  const handleUpdatePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      toast.error("Please fill in all fields");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    if (strength < 50) {
      toast.error("Password is too weak");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      await trackActivity("Change Password", "security_update");
      toast.success("Password updated successfully");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = () => {
    toast.info("2FA setup process initiated");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Secure your account with a strong password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {passwords.new && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Strength: <span className="font-medium">{strengthText}</span></span>
                  <span>{strength}%</span>
                </div>
                <Progress value={strength} className="h-1" indicatorClassName={strengthColor} />
                <ul className="text-[10px] space-y-1 mt-2 text-muted-foreground">
                  <li className="flex items-center gap-1">
                    {passwords.new.length > 8 ? <Check size={10} className="text-success" /> : <X size={10} />}
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-1">
                    {/[A-Z]/.test(passwords.new) ? <Check size={10} className="text-success" /> : <X size={10} />}
                    At least one uppercase letter
                  </li>
                  <li className="flex items-center gap-1">
                    {/[0-9]/.test(passwords.new) ? <Check size={10} className="text-success" /> : <X size={10} />}
                    At least one number
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            variant="blue"
            onClick={handleUpdatePassword}
            disabled={loading || !passwords.new || passwords.new !== passwords.confirm}
            className="w-full sm:w-auto"
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-dashed">
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">Use an app like Google Authenticator to get security codes.</p>
            </div>
            <Button variant="outline" onClick={handleSetup2FA}>Setup 2FA</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Login Sessions
          </CardTitle>
          <CardDescription>Manage your active sessions across different devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium text-sm">Chrome on Windows</p>
                <p className="text-xs text-muted-foreground">London, UK • Current Session</p>
              </div>
              <Badge variant="outline" className="text-success border-success/30 bg-success/10">Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b text-muted-foreground">
              <div>
                <p className="font-medium text-sm">Safari on iPhone</p>
                <p className="text-xs">Paris, France • 2 days ago</p>
              </div>
              <Button variant="ghost" size="sm">Revoke</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
