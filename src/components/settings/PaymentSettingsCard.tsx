import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CreditCard } from "lucide-react";
import { PaymentSettings } from "@/hooks/useSettings";
import { SettingsRowSkeleton } from "@/components/skeletons";

interface PaymentSettingsCardProps {
  settings: PaymentSettings | undefined;
  isLoading: boolean;
  isPending: boolean;
  onSettingChange: (key: keyof PaymentSettings, value: boolean | number) => void;
}

export const PaymentSettingsCard = ({
  settings,
  isLoading,
  isPending,
  onSettingChange,
}: PaymentSettingsCardProps) => {
  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Settings
        </CardTitle>
        <CardDescription>
          Configure accepted payment methods and deposit requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <SettingsRowSkeleton count={5} />
        ) : (
          <>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Cash Payments</p>
                <p className="text-xs text-muted-foreground">Accept cash payments at front desk</p>
              </div>
              <Switch
                checked={settings?.cash_enabled ?? true}
                onCheckedChange={(checked) => onSettingChange("cash_enabled", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Card Payments</p>
                <p className="text-xs text-muted-foreground">Accept credit/debit card payments</p>
              </div>
              <Switch
                checked={settings?.card_enabled ?? true}
                onCheckedChange={(checked) => onSettingChange("card_enabled", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Bank Transfer</p>
                <p className="text-xs text-muted-foreground">Accept bank transfer payments</p>
              </div>
              <Switch
                checked={settings?.bank_transfer_enabled ?? false}
                onCheckedChange={(checked) => onSettingChange("bank_transfer_enabled", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Require Deposit</p>
                <p className="text-xs text-muted-foreground">Require deposit payment on booking</p>
              </div>
              <Switch
                checked={settings?.require_deposit ?? false}
                onCheckedChange={(checked) => onSettingChange("require_deposit", checked)}
                disabled={isPending}
              />
            </div>
            {settings?.require_deposit && (
              <div className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">Deposit Percentage</p>
                  <span className="text-sm font-semibold text-primary">
                    {settings?.deposit_percentage ?? 20}%
                  </span>
                </div>
                <Slider
                  value={[settings?.deposit_percentage ?? 20]}
                  onValueChange={([value]) => onSettingChange("deposit_percentage", value)}
                  min={5}
                  max={100}
                  step={5}
                  disabled={isPending}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
