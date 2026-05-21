import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropertySettings } from "@/hooks/useSettings";
import { FormSkeleton } from "@/components/skeletons";

interface PropertySettingsCardProps {
  settings: PropertySettings | undefined;
  isLoading: boolean;
  isPending: boolean;
  onSettingChange: (key: keyof PropertySettings, value: string) => void;
}

export const PropertySettingsCard = ({
  settings,
  isLoading,
  isPending,
  onSettingChange,
}: PropertySettingsCardProps) => {
  if (isLoading) {
    return <FormSkeleton fields={8} />;
  }

  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
        <CardDescription>Update your hotel information and branding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="propertyName">Property Name</Label>
            <Input
              id="propertyName"
              value={settings?.name ?? ""}
              onChange={(e) => onSettingChange("name", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyCode">Property Code</Label>
            <Input
              id="propertyCode"
              value={settings?.code ?? ""}
              onChange={(e) => onSettingChange("code", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={settings?.address ?? ""}
            onChange={(e) => onSettingChange("address", e.target.value)}
            className="bg-secondary"
            disabled={isPending}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={settings?.city ?? ""}
              onChange={(e) => onSettingChange("city", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={settings?.state ?? ""}
              onChange={(e) => onSettingChange("state", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              value={settings?.zip ?? ""}
              onChange={(e) => onSettingChange("zip", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={settings?.phone ?? ""}
              onChange={(e) => onSettingChange("phone", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings?.email ?? ""}
              onChange={(e) => onSettingChange("email", e.target.value)}
              className="bg-secondary"
              disabled={isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
