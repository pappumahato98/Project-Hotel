import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Send,
  Users,
  History,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const mockBroadcasts = [
  { id: 1, title: "Maintenance Alert", message: "Water supply will be interrupted tomorrow from 2 AM to 4 AM.", sentBy: "Admin", date: "2024-03-20 02:00 PM", recipients: "All Staff", status: "delivered" },
  { id: 2, title: "Policy Update", message: "New check-in procedures are now in effect. Please review the manual.", sentBy: "Manager", date: "2024-03-18 10:00 AM", recipients: "Front Desk", status: "delivered" },
];

export const BroadcastSettings = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendBroadcast = () => {
    if (!title || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSending(true);
    // Simulate API call
    setTimeout(() => {
      setIsSending(false);
      toast.success("Broadcast sent successfully to all staff");
      setTitle("");
      setMessage("");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Create New Broadcast
          </CardTitle>
          <CardDescription>Send an immediate notification to all or specific staff members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-title">Subject / Title</Label>
            <Input
              id="broadcast-title"
              placeholder="e.g., Emergency Maintenance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast-message">Message Content</Label>
            <Textarea
              id="broadcast-message"
              placeholder="Write your announcement here..."
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="blue"
              className="gap-2"
              onClick={handleSendBroadcast}
              disabled={isSending}
            >
              <Send className="h-4 w-4" />
              {isSending ? "Sending..." : "Send Broadcast"}
            </Button>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Select Group
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Broadcast History
          </CardTitle>
          <CardDescription>Recent announcements sent through the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockBroadcasts.map((b) => (
              <div key={b.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.title}</span>
                    <Badge variant="secondary" className="text-[10px]">{b.recipients}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {b.date}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{b.message}</p>
                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">Sent by: <span className="text-foreground font-medium">{b.sentBy}</span></span>
                  <div className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Delivered
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
