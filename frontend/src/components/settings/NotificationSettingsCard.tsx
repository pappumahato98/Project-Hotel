import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { NotificationSettings } from "@/hooks/useSettings";
import { SettingsRowSkeleton } from "@/components/skeletons";

interface NotificationSettingsCardProps {
  settings: NotificationSettings | undefined;
  isLoading: boolean;
  isPending: boolean;
  onSettingChange: (key: keyof NotificationSettings, value: boolean) => void;
}

export const NotificationSettingsCard = ({
  settings,
  isLoading,
  isPending,
  onSettingChange,
}: NotificationSettingsCardProps) => {
  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure how you receive alerts and updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <SettingsRowSkeleton count={5} />
        ) : (
          <>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">New Booking Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified when a new reservation is made</p>
              </div>
              <Switch
                checked={settings?.new_booking_alerts ?? true}
                onCheckedChange={(checked) => onSettingChange("new_booking_alerts", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Check-in Reminders</p>
                <p className="text-xs text-muted-foreground">Receive reminders for upcoming arrivals</p>
              </div>
              <Switch
                checked={settings?.checkin_reminders ?? true}
                onCheckedChange={(checked) => onSettingChange("checkin_reminders", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Low Inventory Alerts</p>
                <p className="text-xs text-muted-foreground">Alert when supplies are running low</p>
              </div>
              <Switch
                checked={settings?.low_inventory_alerts ?? true}
                onCheckedChange={(checked) => onSettingChange("low_inventory_alerts", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Payment Notifications</p>
                <p className="text-xs text-muted-foreground">Get notified about payment status changes</p>
              </div>
              <Switch
                checked={settings?.payment_notifications ?? false}
                onCheckedChange={(checked) => onSettingChange("payment_notifications", checked)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Daily Summary</p>
                <p className="text-xs text-muted-foreground">Receive a daily digest of property activity</p>
              </div>
              <Switch
                checked={settings?.daily_summary ?? true}
                onCheckedChange={(checked) => onSettingChange("daily_summary", checked)}
                disabled={isPending}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
