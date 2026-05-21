import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ClipboardCheck } from "lucide-react";
import { CheckInFieldSettings } from "@/hooks/useSettings";
import { SettingsRowSkeleton } from "@/components/skeletons";

interface CheckInSettingsCardProps {
  settings: CheckInFieldSettings | undefined;
  isLoading: boolean;
  isPending: boolean;
  onSettingChange: (key: keyof CheckInFieldSettings, value: boolean) => void;
}

export const CheckInSettingsCard = ({
  settings,
  isLoading,
  isPending,
  onSettingChange,
}: CheckInSettingsCardProps) => {
  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Check-in Field Requirements
        </CardTitle>
        <CardDescription>
          Configure which fields are mandatory during guest check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <SettingsRowSkeleton count={3} />
        ) : (
          <>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">ID Document Required</p>
                <p className="text-xs text-muted-foreground">
                  Require guests to provide identification (passport, driver's license, etc.)
                </p>
              </div>
              <Switch
                checked={settings?.id_required ?? true}
                onCheckedChange={(checked) => onSettingChange("id_required", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Phone Number Required</p>
                <p className="text-xs text-muted-foreground">
                  Require guests to provide a contact phone number
                </p>
              </div>
              <Switch
                checked={settings?.phone_required ?? false}
                onCheckedChange={(checked) => onSettingChange("phone_required", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Email Address Required</p>
                <p className="text-xs text-muted-foreground">
                  Require guests to provide an email address
                </p>
              </div>
              <Switch
                checked={settings?.email_required ?? false}
                onCheckedChange={(checked) => onSettingChange("email_required", checked)}
                disabled={isPending}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
