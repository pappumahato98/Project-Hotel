import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UIPreferences } from "@/hooks/useSettings";
import { Zap, Play } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimationControlsProps {
  prefs: UIPreferences;
  onUpdate: (updates: Partial<UIPreferences>) => void;
}

export const AnimationControls = ({ prefs, onUpdate }: AnimationControlsProps) => {
  const [testToggle, setTestToggle] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Motion & Interaction
          </CardTitle>
          <CardDescription>Control how the interface responds to user actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/5">
            <div className="space-y-0.5">
              <Label>Enable Interaction Animations</Label>
              <p className="text-xs text-muted-foreground">Toggle all transitions and motion effects.</p>
            </div>
            <Switch
              checked={prefs.animations_enabled}
              onCheckedChange={(checked) => onUpdate({ animations_enabled: checked })}
            />
          </div>

          <div className="space-y-4">
            <Label>Animation Preset</Label>
            <RadioGroup
              value={prefs.animation_preset}
              onValueChange={(val: any) => onUpdate({ animation_preset: val })}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { id: "spring", label: "iOS Spring", desc: "Fluid & bouncy" },
                { id: "smooth", label: "Smooth", desc: "Standard ease" },
                { id: "linear", label: "Linear", desc: "Direct motion" },
                { id: "none", label: "None", desc: "Instant" },
              ].map((item) => (
                <div key={item.id}>
                  <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                  <Label
                    htmlFor={item.id}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                  >
                    <span className="text-sm font-bold mb-1">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="mt-8 p-6 rounded-xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Physics Lab</h4>
            <div className="flex gap-4">
              <button
                onClick={() => setTestToggle(!testToggle)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2 shadow-lg"
              >
                <Play className="h-3 w-3 fill-current" />
                Trigger Sample
              </button>
            </div>

            <div className="h-24 w-full flex items-center justify-center relative overflow-hidden">
               <AnimatePresence mode="wait">
                 {testToggle ? (
                   <motion.div
                     key="box1"
                     initial={{ scale: 0.8, opacity: 0, y: 20 }}
                     animate={{
                       scale: 1,
                       opacity: 1,
                       y: 0,
                       transition: prefs.animation_preset === "spring" ? { type: "spring", stiffness: 300, damping: 20 } :
                                   prefs.animation_preset === "smooth" ? { duration: 0.4, ease: "easeInOut" } :
                                   prefs.animation_preset === "linear" ? { duration: 0.3, ease: "linear" } : { duration: 0 }
                     }}
                     exit={{ scale: 0.8, opacity: 0, y: -20 }}
                     className="h-12 w-32 rounded-2xl bg-primary shadow-glow flex items-center justify-center text-primary-foreground text-xs font-bold"
                   >
                     Dynamic Interaction
                   </motion.div>
                 ) : (
                    <motion.div
                      key="box2"
                      initial={{ scale: 0.8, opacity: 0, y: 20 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        y: 0,
                        transition: { type: "spring", stiffness: 300, damping: 20 }
                      }}
                      className="h-12 w-32 rounded-2xl border-2 border-primary/20 flex items-center justify-center text-primary text-xs font-bold"
                    >
                      Idle State
                    </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
