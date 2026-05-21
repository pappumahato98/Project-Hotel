import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGuestCommunications } from "@/hooks/useGuestManagement";
import { Guest } from "@/hooks/useGuests";
import { Plus, Mail, Phone, MessageSquare, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatAD } from "@/lib/utils";
import { toast } from "sonner";

const channelIcons: Record<string, any> = {
  email: Mail,
  phone: Phone,
  sms: MessageSquare,
};

const channelColors: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-400",
  phone: "bg-success/20 text-success",
  sms: "bg-purple-500/20 text-purple-400",
};

interface Props {
  guests: Guest[];
}

export function GuestCommunicationsTab({ guests }: Props) {
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  return (
    <div className="space-y-6">
      {!selectedGuest ? (
        <Card variant="elevated">
          <CardHeader><CardTitle>Select a Guest to View Communications</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {guests.map((g) => (
                <Button key={g.id} variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setSelectedGuest(g)}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs">{g.first_name[0]}{g.last_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{g.first_name} {g.last_name}</p>
                    <p className="text-xs text-muted-foreground">{g.email || g.phone || "No contact"}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Communications — {selectedGuest.first_name} {selectedGuest.last_name}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedGuest(null)}>Change Guest</Button>
          </div>
          <CommunicationsList guestId={selectedGuest.id} />
        </>
      )}
    </div>
  );
}

function CommunicationsList({ guestId }: { guestId: string }) {
  const { data: communications = [], logCommunication } = useGuestCommunications(guestId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    channel: "email",
    direction: "outbound",
    subject: "",
    message: "",
  });

  const handleLog = () => {
    logCommunication.mutate({
      guest_id: guestId,
      channel: form.channel,
      direction: form.direction,
      subject: form.subject || null,
      message: form.message,
      status: "sent",
      sent_by: null,
    }, {
      onSuccess: () => {
        toast.success("Communication logged");
        setDialogOpen(false);
        setForm({ channel: "email", direction: "outbound", subject: "", message: "" });
      },
      onError: () => toast.error("Failed to log communication"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Log Communication
        </Button>
      </div>

      <Card variant="elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communications.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No communications logged yet</TableCell></TableRow>
              ) : communications.map((c) => {
                const Icon = channelIcons[c.channel] || MessageSquare;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{formatAD(c.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={channelColors[c.channel] || ""}><Icon className="h-3 w-3 mr-1" />{c.channel}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.direction === "inbound" ? (
                        <span className="flex items-center gap-1 text-sm"><ArrowDownLeft className="h-3 w-3 text-success" /> Inbound</span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm"><ArrowUpRight className="h-3 w-3 text-primary" /> Outbound</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{c.subject || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{c.message}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Booking confirmation" />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Communication details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLog} disabled={!form.message || logCommunication.isPending}>
              {logCommunication.isPending ? "Saving..." : "Log Communication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
