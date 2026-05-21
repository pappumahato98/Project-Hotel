import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { formatAD } from "@/lib/utils";
import { Bell, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categoryIcons: Record<string, any> = {
  booking: Info,
  checkin: CheckCircle2,
  settings: Info,
  alert: AlertTriangle,
  info: Info,
};

const categoryColors: Record<string, string> = {
  booking: "text-blue-500",
  checkin: "text-success",
  settings: "text-amber-500",
  alert: "text-destructive",
  info: "text-muted-foreground",
};

export const AlertsTab = () => {
  const { notifications, isLoading } = useNotifications();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications & Alerts</CardTitle>
        <CardDescription>Stay updated with the latest system activities.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No notifications found.</div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const Icon = categoryIcons[notification.category] || Info;
              return (
                <div key={notification.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`mt-1 p-2 rounded-full bg-background border ${categoryColors[notification.category]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{notification.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatAD(new Date(notification.created_at), "time")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {notification.category}
                      </Badge>
                      {!notification.is_read && (
                        <Badge variant="default" className="text-[10px] bg-primary">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
