import { useState } from "react";
import { useGuestMessages } from "@/hooks/useGuestMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, Package, AlertCircle, Archive, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";
import { useGuests } from "@/hooks/useGuests";

export const FrontDeskMessages = () => {
  const { messages, isLoading, createMessage, updateMessageStatus } = useGuestMessages();
  const { data: guests = [] } = useGuests();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    guest_id: "",
    sender_name: "",
    message_text: "",
    message_type: "standard"
  });

  const handleCreate = async () => {
    await createMessage.mutateAsync(newMessage);
    setIsAddOpen(false);
    setNewMessage({ guest_id: "", sender_name: "", message_text: "", message_type: "standard" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'read': return <Badge variant="secondary">Read</Badge>;
      case 'archived': return <Badge variant="outline" className="opacity-50">Archived</Badge>;
      default: return <Badge variant="default" className="bg-blue-500">Delivered</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'package': return <Package className="h-4 w-4 text-amber-500" />;
      case 'emergency': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Mail className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold font-display">Guest Communication Center</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Log New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Guest Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>For Guest</Label>
                <Select
                  value={newMessage.guest_id}
                  onValueChange={(v) => setNewMessage({...newMessage, guest_id: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Search guest..." /></SelectTrigger>
                  <SelectContent>
                    {guests.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.first_name} {g.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From (Sender Name)</Label>
                <Input
                  value={newMessage.sender_name}
                  onChange={(e) => setNewMessage({...newMessage, sender_name: e.target.value})}
                  placeholder="e.g., John Doe / DHL Delivery"
                />
              </div>
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select
                  value={newMessage.message_type}
                  onValueChange={(v) => setNewMessage({...newMessage, message_type: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Message</SelectItem>
                    <SelectItem value="package">Package / Parcel</SelectItem>
                    <SelectItem value="emergency">Emergency / Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={newMessage.message_text}
                  onChange={(e) => setNewMessage({...newMessage, message_text: e.target.value})}
                  placeholder="Enter the full message details..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMessage.isPending}>Save Message</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card variant="elevated">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>For Guest</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.filter(m => m.status !== 'archived').map((msg) => (
                    <TableRow key={msg.id} className={msg.message_type === 'emergency' ? "bg-destructive/5" : ""}>
                      <TableCell>{getTypeIcon(msg.message_type)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatAD(new Date(msg.created_at), "time")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {msg.guests?.first_name} {msg.guests?.last_name}
                        {msg.rooms?.room_number && <span className="block text-[10px] text-muted-foreground font-mono">Room {msg.rooms.room_number}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{msg.sender_name}</TableCell>
                      <TableCell>{getStatusBadge(msg.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateMessageStatus.mutate({ id: msg.id, status: 'read' })}
                            disabled={msg.status === 'read'}
                          >
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateMessageStatus.mutate({ id: msg.id, status: 'archived' })}
                          >
                            <Archive className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {messages.filter(m => m.status !== 'archived').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                        No active messages for in-house guests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="glass" className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unread Messages</span>
                <Badge className="bg-primary">{messages.filter(m => m.status === 'delivered').length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Packages Awaiting</span>
                <Badge variant="outline" className="text-amber-500 border-amber-500">
                  {messages.filter(m => m.message_type === 'package' && m.status !== 'archived').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Emergencies</span>
                <Badge variant="destructive">
                  {messages.filter(m => m.message_type === 'emergency' && m.status !== 'archived').length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
