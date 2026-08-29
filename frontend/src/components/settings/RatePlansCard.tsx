import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tags, Percent } from "lucide-react";
import { RatePlansSettings } from "@/hooks/useSettings";
import { SettingsRowSkeleton } from "@/components/skeletons";

interface RatePlansCardProps {
  settings: RatePlansSettings | undefined;
  isLoading: boolean;
  isPending: boolean;
  onToggle: (planId: string, enabled: boolean) => void;
  onDiscountChange: (planId: string, discount: number) => void;
}

export const RatePlansCard = ({
  settings,
  isLoading,
  isPending,
  onToggle,
  onDiscountChange,
}: RatePlansCardProps) => {
  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Rate Plans
        </CardTitle>
        <CardDescription>
          Configure pricing plans and discounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <SettingsRowSkeleton count={4} />
        ) : (
          <>
            {settings?.plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`py-3 ${index < settings.plans.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                  <Switch
                    checked={plan.enabled}
                    onCheckedChange={(checked) => onToggle(plan.id, checked)}
                    disabled={isPending}
                  />
                </div>
                {plan.enabled && plan.id !== "standard" && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Percent className="h-3 w-3" />
                      <span>Discount:</span>
                    </div>
                    <Input
                      type="number"
                      value={plan.discount_percentage}
                      onChange={(e) => onDiscountChange(plan.id, Number(e.target.value))}
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
