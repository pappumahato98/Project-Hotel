import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { UIPreferences } from "@/hooks/useSettings";
import { Box, Layers } from "lucide-react";

interface MaterialControlsProps {
  prefs: UIPreferences;
  onUpdate: (updates: Partial<UIPreferences>) => void;
}

export const MaterialControls = ({ prefs, onUpdate }: MaterialControlsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Glassmorphism Engine
          </CardTitle>
          <CardDescription>Fine-tune the transparency and blur levels of iOS materials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 py-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Blur Intensity ({prefs.blur_amount}px)</Label>
              <span className="text-xs text-muted-foreground">Amount of backdrop blur</span>
            </div>
            <Slider
              value={[prefs.blur_amount]}
              min={0}
              max={40}
              step={1}
              onValueChange={([val]) => onUpdate({ blur_amount: val })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Background Opacity ({Math.round(prefs.background_opacity * 100)}%)</Label>
              <span className="text-xs text-muted-foreground">Transparency of the material background</span>
            </div>
            <Slider
              value={[prefs.background_opacity * 100]}
              min={10}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ background_opacity: val / 100 })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Saturation Boost ({prefs.saturation}x)</Label>
              <span className="text-xs text-muted-foreground">Enhance colors behind the material</span>
            </div>
            <Slider
              value={[prefs.saturation * 100]}
              min={100}
              max={300}
              step={10}
              onValueChange={([val]) => onUpdate({ saturation: val / 100 })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4" />
            Shape & Spacing
          </CardTitle>
          <CardDescription>Control the curvature and density of the interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 py-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Corner Radius ({prefs.base_radius}px)</Label>
              <span className="text-xs text-muted-foreground">Base border radius for all components</span>
            </div>
            <Slider
              value={[prefs.base_radius]}
              min={0}
              max={32}
              step={2}
              onValueChange={([val]) => onUpdate({ base_radius: val })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Spacing Scale ({prefs.base_spacing}px)</Label>
              <span className="text-xs text-muted-foreground">Multiplication factor for gaps and padding</span>
            </div>
            <Slider
              value={[prefs.base_spacing]}
              min={2}
              max={8}
              step={1}
              onValueChange={([val]) => onUpdate({ base_spacing: val })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
