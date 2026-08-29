import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Rocket, RotateCcw, Layout, Palette, Type, Zap, Box } from "lucide-react";
import { useUIPreferences, useUpdateUIPreferences, useStagedUIPreferences, useUpdateStagedUIPreferences, UIPreferences } from "@/hooks/useSettings";
import { toast } from "sonner";
import { ThemeControls } from "./ThemeControls";
import { MaterialControls } from "./MaterialControls";
import { TypographyControls } from "./TypographyControls";
import { AnimationControls } from "./AnimationControls";
import { TemplateManager } from "./TemplateManager";
import { ReleaseWorkflow } from "./ReleaseWorkflow";
import { SegmentedControl } from "@/components/ui/ios/SegmentedControl";

const PreviewArea = ({ prefs }: { prefs: UIPreferences }) => {
  const [segValue, setSegValue] = useState("daily");

  return (
    <div className="space-y-6 p-8 rounded-2xl bg-slate-900/10 border border-dashed border-border flex flex-col items-center">
      <div
        className="w-full max-w-md p-6 rounded-3xl shadow-2xl transition-all duration-500"
        style={{
          backgroundColor: `hsla(var(--background) / ${prefs.background_opacity})`,
          backdropFilter: `blur(${prefs.blur_amount}px) saturate(${prefs.saturation})`,
          borderRadius: `${prefs.base_radius * 2}px`,
          border: `1px solid hsla(var(--foreground) / 0.1)`,
          fontFamily: prefs.font_family_sans
        }}
      >
        <div className="flex justify-between items-start mb-6">
          <div style={{ fontFamily: prefs.font_family_display }}>
            <h3 className="text-xl font-bold">Revenue Analytics</h3>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Property Performance</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
             <Layout className="h-4 w-4 text-primary" />
          </div>
        </div>

        <SegmentedControl
          options={[
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" }
          ]}
          value={segValue}
          onChange={setSegValue}
          className="mb-6"
        />

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
             <div className="text-2xl font-bold text-primary">$42,500.00</div>
             <div className="text-[10px] text-muted-foreground font-medium">TOTAL BOOKINGS THIS MONTH</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
               <div className="text-lg font-bold">84%</div>
               <div className="text-[9px] text-muted-foreground uppercase">Occupancy</div>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
               <div className="text-lg font-bold">$245</div>
               <div className="text-[9px] text-muted-foreground uppercase">ADR</div>
            </div>
          </div>
        </div>

        <Button className="w-full mt-6 rounded-2xl bg-primary shadow-lg shadow-primary/20">
          View Detailed Report
        </Button>
      </div>
      <p className="text-xs text-muted-foreground animate-pulse mt-4">Live Staging Preview: Components above reflect your current unsaved adjustments.</p>
    </div>
  );
};

export const DesignSystemTab = () => {
  const { data: livePrefs, isLoading: loadingLive } = useUIPreferences();
  const { data: stagedPrefs, isLoading: loadingStaged } = useStagedUIPreferences();

  const updateStaged = useUpdateStagedUIPreferences();
  const updateLive = useUpdateUIPreferences();

  const [localPrefs, setLocalPrefs] = useState<UIPreferences | null>(null);

  useEffect(() => {
    if (stagedPrefs) {
      setLocalPrefs(stagedPrefs);
    } else if (livePrefs) {
      setLocalPrefs(livePrefs);
    }
  }, [stagedPrefs, livePrefs]);

  if (loadingLive || loadingStaged || !localPrefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleUpdate = (updates: Partial<UIPreferences>) => {
    setLocalPrefs((prev) => prev ? { ...prev, ...updates } : null);
  };

  const handleSaveStaged = () => {
    if (localPrefs) {
      updateStaged.mutate(localPrefs, {
        onSuccess: () => toast.success("Staged changes saved. Use Publish to go live.")
      });
    }
  };

  const handlePublish = () => {
    if (localPrefs) {
      const publishedPrefs = { ...localPrefs, is_staged: false, last_published_at: new Date().toISOString() };
      updateLive.mutate(publishedPrefs, {
        onSuccess: () => {
          updateStaged.mutate(publishedPrefs);
          toast.success("Design system published to all users!");
        }
      });
    }
  };

  const handleReset = () => {
    if (livePrefs) {
      setLocalPrefs(livePrefs);
      toast.info("Changes reset to live version");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            iOS Design System Engine
          </h2>
          <p className="text-sm text-muted-foreground">Configure global UI behaviors, materials, and patterns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSaveStaged} disabled={updateStaged.isPending} className="gap-2">
            {updateStaged.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={updateLive.isPending} className="gap-2 bg-primary hover:bg-primary/90">
            {updateLive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publish Live
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <TemplateManager currentPrefs={localPrefs} onApply={setLocalPrefs} />
          <ReleaseWorkflow livePrefs={livePrefs} stagedPrefs={localPrefs} onPublish={handlePublish} />
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="materials" className="space-y-6">
            <TabsList>
              <TabsTrigger value="theme" className="gap-2">
                <Palette className="h-4 w-4" />
                Theme & Colors
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-2">
                <Box className="h-4 w-4" />
                iOS Materials
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-2">
                <Type className="h-4 w-4" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="animations" className="gap-2">
                <Zap className="h-4 w-4" />
                Animations
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Layout className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="theme" className="mt-0 space-y-6">
              <ThemeControls prefs={localPrefs} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="materials" className="mt-0 space-y-6">
              <MaterialControls prefs={localPrefs} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="typography" className="mt-0 space-y-6">
              <TypographyControls prefs={localPrefs} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="animations" className="mt-0 space-y-6">
              <AnimationControls prefs={localPrefs} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="preview" className="mt-0 space-y-6">
              <PreviewArea prefs={localPrefs} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
