import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Bell, Mail, Smartphone, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { trackActivity } from "@/utils/auditLogger";
import { useUIPreferences, useUpdateUIPreferences } from "@/hooks/useSettings";

export const PreferencesTab = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: uiPrefs } = useUIPreferences();
  const updateUI = useUpdateUIPreferences();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Preferences</CardTitle>
        <CardDescription>Customize your experience within the ERP.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {mounted && resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Toggle between light and dark theme.</p>
            </div>
          </div>
          <Switch
            disabled={!mounted}
            checked={mounted && resolvedTheme === "dark"}
            onCheckedChange={(checked) => {
              const newTheme = checked ? "dark" : "light";
              setTheme(newTheme);
              trackActivity("Change Theme", "preferences_update", { theme: newTheme });
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Sidebar Dropdowns</p>
              <p className="text-sm text-muted-foreground">Show nested pages as dropdowns in the sidebar.</p>
            </div>
          </div>
          <Switch
            checked={uiPrefs?.sidebar_dropdowns_enabled}
            onCheckedChange={(checked) => {
              updateUI.mutate({ ...uiPrefs!, sidebar_dropdowns_enabled: checked });
              trackActivity("Update UI Preferences", "preferences_update", { sidebar_dropdowns_enabled: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">Receive browser alerts for important updates.</p>
            </div>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5" />
            <div>
              <p className="font-medium">Email Digests</p>
              <p className="text-sm text-muted-foreground">Weekly summary of activities and reports.</p>
            </div>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">iOS Materials</p>
              <p className="text-sm text-muted-foreground">Enable glassmorphism and backdrop blur effects.</p>
            </div>
          </div>
          <Switch
            checked={uiPrefs?.ios_materials}
            onCheckedChange={(checked) => {
              updateUI.mutate({ ...uiPrefs!, ios_materials: checked });
              trackActivity("Update UI Preferences", "preferences_update", { ios_materials: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Reduced Animations</p>
              <p className="text-sm text-muted-foreground">Minimize motion for a faster feel.</p>
            </div>
          </div>
          <Switch
            checked={!uiPrefs?.animations_enabled}
            onCheckedChange={(checked) => {
              updateUI.mutate({ ...uiPrefs!, animations_enabled: !checked });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
