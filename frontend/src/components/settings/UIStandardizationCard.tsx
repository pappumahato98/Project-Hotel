import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useUIPreferences, useUpdateUIPreferences, UIPreferences } from "@/hooks/useSettings";
import {
  Loader2, LayoutDashboard, PanelLeft, Maximize, Monitor,
  MousePointer2, ChevronDown, Layers
} from "lucide-react";

export function UIStandardizationCard() {
  const { data: uiPrefs, isLoading } = useUIPreferences();
  const updateUI = useUpdateUIPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>UI Standardization</CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleStyleChange = (value: string) => {
    if (uiPrefs) {
      updateUI.mutate({
        ...uiPrefs,
        navigation_style: value as UIPreferences["navigation_style"]
      });
    }
  };

  const handleTogglePreference = (key: keyof UIPreferences, value: boolean) => {
    if (uiPrefs) {
      updateUI.mutate({
        ...uiPrefs,
        [key]: value
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI Standardization</CardTitle>
        <CardDescription>
          Customize the navigation system to match your workflow preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base">Navigation Style</Label>
          <RadioGroup
            value={uiPrefs?.navigation_style || "default"}
            onValueChange={handleStyleChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="default"
                id="style-default"
                className="peer sr-only"
              />
              <Label
                htmlFor="style-default"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <LayoutDashboard className="mb-3 h-6 w-6" />
                <span className="text-sm font-semibold">Default Sidebar</span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Standard expandable sidebar (256px)
                </span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="vertical-icon"
                id="style-vertical-icon"
                className="peer sr-only"
              />
              <Label
                htmlFor="style-vertical-icon"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <Monitor className="mb-3 h-6 w-6" />
                <span className="text-sm font-semibold">Vertical Icon-Only</span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Compact 70px sidebar showing only icons
                </span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="hidden-hover"
                id="style-hidden-hover"
                className="peer sr-only"
              />
              <Label
                htmlFor="style-hidden-hover"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <PanelLeft className="mb-3 h-6 w-6" />
                <span className="text-sm font-semibold">Hidden Hover-Trigger</span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Sidebar slides out when hovering left edge
                </span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="horizontal-subheader"
                id="style-horizontal-subheader"
                className="peer sr-only"
              />
              <Label
                htmlFor="style-horizontal-subheader"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <Maximize className="mb-3 h-6 w-6" />
                <span className="text-sm font-semibold">Horizontal Sub-Header</span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Navigation bar below the main header
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="pt-6 border-t space-y-4">
          <Label className="text-base">Behavioral Settings</Label>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
            <div className="flex items-center gap-3">
              <ChevronDown className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Enable Dropdowns</p>
                <p className="text-xs text-muted-foreground">Toggle nested menu items in sidebar and horizontal nav</p>
              </div>
            </div>
            <Switch
              checked={uiPrefs?.sidebar_dropdowns_enabled ?? true}
              onCheckedChange={(v) => handleTogglePreference("sidebar_dropdowns_enabled", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
            <div className="flex items-center gap-3">
              <MousePointer2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Persistent Dialog Popups</p>
                <p className="text-xs text-muted-foreground">Prevent closing dialogs/menus on outside click</p>
              </div>
            </div>
            <Switch
              checked={uiPrefs?.persistent_popups ?? true}
              onCheckedChange={(v) => handleTogglePreference("persistent_popups", v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Standardize Page Dropdowns</p>
                <p className="text-xs text-muted-foreground">Uniform styling for form selection menus and page-level dropdowns</p>
              </div>
            </div>
            <Switch
              checked={uiPrefs?.standardize_page_dropdowns ?? true}
              onCheckedChange={(v) => handleTogglePreference("standardize_page_dropdowns", v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
