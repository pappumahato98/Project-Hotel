import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { UIPreferences } from "@/hooks/useSettings";
import { Type } from "lucide-react";

interface TypographyControlsProps {
  prefs: UIPreferences;
  onUpdate: (updates: Partial<UIPreferences>) => void;
}

export const TypographyControls = ({ prefs, onUpdate }: TypographyControlsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4" />
            Typography Configuration
          </CardTitle>
          <CardDescription>Customize fonts and text scaling for a cleaner look.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Sans Font (Body)</Label>
              <Input
                value={prefs.font_family_sans}
                onChange={(e) => onUpdate({ font_family_sans: e.target.value })}
                placeholder="Inter, system-ui, sans-serif"
              />
              <p className="text-[10px] text-muted-foreground italic">Primary font for body text and UI controls.</p>
            </div>
            <div className="space-y-2">
              <Label>Display Font (Headings)</Label>
              <Input
                value={prefs.font_family_display}
                onChange={(e) => onUpdate({ font_family_display: e.target.value })}
                placeholder="Playfair Display, serif"
              />
              <p className="text-[10px] text-muted-foreground italic">Elegant font for headers and luxury branding.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between">
              <Label>Base Font Size ({prefs.base_font_size}px)</Label>
              <span className="text-xs text-muted-foreground">Adjust readability across the entire app</span>
            </div>
            <Slider
              value={[prefs.base_font_size]}
              min={12}
              max={20}
              step={1}
              onValueChange={([val]) => onUpdate({ base_font_size: val })}
            />
          </div>

          <div className="p-4 rounded-lg bg-secondary/10 border border-border/50 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Live Preview</h4>
            <div style={{ fontFamily: prefs.font_family_display }}>
              <h3 className="text-2xl font-semibold">Luxury Hospitality Suite</h3>
            </div>
            <div style={{ fontFamily: prefs.font_family_sans, fontSize: `${prefs.base_font_size}px` }}>
              <p className="mt-2 opacity-80 leading-relaxed">
                Experience the perfect blend of modern iOS design principles and enterprise functionality.
                Our system ensures clarity, depth, and consistency in every interaction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
