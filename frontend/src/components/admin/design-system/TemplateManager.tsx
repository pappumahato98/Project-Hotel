import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUITemplates, useUpdateUITemplates, UIPreferences, UITemplate } from "@/hooks/useSettings";
import { Layout, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TemplateManagerProps {
  currentPrefs: UIPreferences;
  onApply: (prefs: UIPreferences) => void;
}

export const TemplateManager = ({ currentPrefs, onApply }: TemplateManagerProps) => {
  const { data: templateSettings, isLoading } = useUITemplates();
  const updateTemplates = useUpdateUITemplates();

  const handleSaveAsTemplate = () => {
    const name = window.prompt("Enter template name:");
    if (!name) return;

    const newTemplate: UITemplate = {
      id: crypto.randomUUID(),
      name,
      preferences: currentPrefs,
      is_system: false,
    };

    const currentTemplates = templateSettings?.templates || [];
    updateTemplates.mutate({ templates: [...currentTemplates, newTemplate] }, {
      onSuccess: () => toast.success(`Template "${name}" saved!`)
    });
  };

  const handleDeleteTemplate = (id: string) => {
    const currentTemplates = templateSettings?.templates || [];
    updateTemplates.mutate({ templates: currentTemplates.filter(t => t.id !== id) });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Layout className="h-4 w-4 text-primary" />
            UI Presets
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveAsTemplate}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-[10px]">Quickly switch between saved patterns.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide pt-2">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
        ) : templateSettings?.templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50 hover:border-primary/50 transition-colors group cursor-pointer"
            onClick={() => {
              onApply(template.preferences);
              toast.info(`Applied template: ${template.name}`);
            }}
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium">{template.name}</span>
              {template.is_system && <Badge className="text-[8px] h-3 px-1 w-fit bg-primary/20 text-primary">System</Badge>}
            </div>
            {!template.is_system && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTemplate(template.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
