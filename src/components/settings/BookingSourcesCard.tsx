import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Globe, Percent } from "lucide-react";
import { BookingSourcesSettings, BookingSource } from "@/hooks/useSettings";
import { SettingsRowSkeleton } from "@/components/skeletons";

interface BookingSourcesCardProps {
  settings: BookingSourcesSettings | undefined;
  isLoading: boolean;
  isPending: boolean;
  onToggle: (sourceId: string, enabled: boolean) => void;
  onCommissionChange: (sourceId: string, commission: number) => void;
}

export const BookingSourcesCard = ({
  settings,
  isLoading,
  isPending,
  onToggle,
  onCommissionChange,
}: BookingSourcesCardProps) => {
  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Booking Sources
        </CardTitle>
        <CardDescription>
          Manage booking channels and commission rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <SettingsRowSkeleton count={4} />
        ) : (
          <>
            {settings?.sources.map((source, index) => (
              <div
                key={source.id}
                className={`py-3 ${index < settings.sources.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{source.name}</p>
                  </div>
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={(checked) => onToggle(source.id, checked)}
                    disabled={isPending}
                  />
                </div>
                {source.enabled && (
                  <div className="flex items-center gap-3 mt-2 pl-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Percent className="h-3 w-3" />
                      <span>Commission:</span>
                    </div>
                    <Input
                      type="number"
                      value={source.commission_percentage}
                      onChange={(e) => onCommissionChange(source.id, Number(e.target.value))}
                      className="w-20 h-8 text-sm"
                      min={0}
                      max={100}
                      disabled={isPending}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};
