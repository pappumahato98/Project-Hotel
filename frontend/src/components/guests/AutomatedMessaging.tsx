import { useState } from "react";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, MessageSquare, Plus, Trash2, Edit, Zap } from "lucide-react";

const triggerTypes = [
  { value: "pre_arrival", label: "Pre-Arrival (1 day before)" },
  { value: "check_in", label: "At Check-In" },
  { value: "welcome", label: "Welcome (after check-in)" },
  { value: "mid_stay", label: "Mid-Stay" },
  { value: "pre_checkout", label: "Pre-Checkout" },
  { value: "post_checkout", label: "Post-Checkout" },
  { value: "birthday", label: "Birthday" },
  { value: "manual", label: "Manual Send" },
];

const channels = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
];

const availableVariables = [
  "{{guest_name}}", "{{first_name}}", "{{room_number}}",
  "{{check_in_date}}", "{{check_out_date}}", "{{hotel_name}}",
  "{{reservation_code}}", "{{total_amount}}",
];

export function AutomatedMessaging() {
  const { data: templates = [], createTemplate, updateTemplate, deleteTemplate } = useMessageTemplates();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger_type: "manual",
    channel: "email",
    subject: "",
    body: "",
    is_active: true,
  });

  const handleCreate = () => {
    createTemplate.mutate(
      {
        name: form.name,
        trigger_type: form.trigger_type,
        channel: form.channel,
        subject: form.subject || null,
        body: form.body,
        is_active: form.is_active,
        variables: availableVariables.filter((v) => form.body.includes(v) || form.subject?.includes(v)),
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setForm({ name: "", trigger_type: "manual", channel: "email", subject: "", body: "", is_active: true });
        },
      }
    );
  };

  const toggleActive = (tpl: any) => {
    updateTemplate.mutate({ id: tpl.id, is_active: !tpl.is_active });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-display">Automated Messaging</h3>
          <p className="text-sm text-muted-foreground">Configure pre-arrival, welcome & post-checkout messages</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create Message Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Welcome Email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {channels.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.channel === "email" && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Welcome to {{hotel_name}}, {{first_name}}!" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Dear {{guest_name}},..." rows={6} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Available variables:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableVariables.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                      onClick={() => setForm({ ...form, body: form.body + " " + v })}>
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name || !form.body || createTemplate.isPending}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((tpl) => {
          const trigger = triggerTypes.find((t) => t.value === tpl.trigger_type);
          return (
            <Card key={tpl.id} variant="elevated" className={!tpl.is_active ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{tpl.name}</CardTitle>
                  <Switch checked={tpl.is_active} onCheckedChange={() => toggleActive(tpl)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Zap className="h-3 w-3 mr-1" />
                    {trigger?.label || tpl.trigger_type}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {tpl.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                    {tpl.channel}
                  </Badge>
                </div>
                {tpl.subject && <p className="text-xs font-medium">Subject: {tpl.subject}</p>}
                <p className="text-xs text-muted-foreground line-clamp-3">{tpl.body}</p>
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(tpl.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No message templates configured. Create your first template to get started.
          </div>
        )}
      </div>
    </div>
  );
}
