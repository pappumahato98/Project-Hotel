import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const SecuritySettingsCard = () => {
  return (
    <Card variant="elevated" className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>Irreversible actions for your property</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
          <div>
            <p className="text-sm font-medium text-foreground">Delete Property</p>
            <p className="text-xs text-muted-foreground">Permanently delete this property and all associated data</p>
          </div>
          <Button variant="destructive" size="sm">Delete</Button>
        </div>
      </CardContent>
    </Card>
  );
};
