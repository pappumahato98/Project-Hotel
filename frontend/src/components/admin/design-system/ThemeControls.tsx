import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { UIPreferences } from "@/hooks/useSettings";
import { Palette, Smartphone } from "lucide-react";

interface ThemeControlsProps {
  prefs: UIPreferences;
  onUpdate: (updates: Partial<UIPreferences>) => void;
}

export const ThemeControls = ({ prefs, onUpdate }: ThemeControlsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Global iOS Mode
          </CardTitle>
          <CardDescription>Enable or disable the iOS-style design system globally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/5">
            <div className="space-y-0.5">
              <Label>Enable iOS Materials</Label>
              <p className="text-xs text-muted-foreground">Applies glassmorphism, dynamic blur, and iOS-style layout principles.</p>
            </div>
            <Switch
              checked={prefs.ios_materials}
              onCheckedChange={(checked) => onUpdate({ ios_materials: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/5">
            <div className="space-y-0.5">
              <Label>Disable on Mobile</Label>
              <p className="text-xs text-muted-foreground">Revert to standard UI on small screens to save performance.</p>
            </div>
            <Switch
              checked={prefs.disable_on_mobile}
              onCheckedChange={(checked) => onUpdate({ disable_on_mobile: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Brand Identity
          </CardTitle>
          <CardDescription>Define the core colors and accents used throughout the iOS system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={prefs.primary_color}
                  onChange={(e) => onUpdate({ primary_color: e.target.value })}
                  placeholder="215 100% 50%"
                />
                <div
                  className="w-10 h-10 rounded border border-border shadow-sm"
                  style={{ backgroundColor: `hsl(${prefs.primary_color})` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  value={prefs.accent_color}
                  onChange={(e) => onUpdate({ accent_color: e.target.value })}
                  placeholder="222 47% 6%"
                />
                <div
                  className="w-10 h-10 rounded border border-border shadow-sm"
                  style={{ backgroundColor: `hsl(${prefs.accent_color})` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
