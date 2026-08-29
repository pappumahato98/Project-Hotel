import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { GuestFeedback } from "@/hooks/useGuestManagement";

interface Props {
  feedback: GuestFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRespond: (id: string, response: string) => Promise<void>;
  isPending: boolean;
}

export function FeedbackResponseDialog({ feedback, open, onOpenChange, onRespond, isPending }: Props) {
  const [response, setResponse] = useState("");

  if (!feedback) return null;

  const handleSubmit = async () => {
    await onRespond(feedback.id, response);
    setResponse("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Original message:</p>
            <p className="text-sm">{feedback.message}</p>
            {feedback.rating && <p className="text-xs text-muted-foreground mt-1">Rating: {feedback.rating} ★</p>}
          </div>
          <div className="space-y-2">
            <Label>Your Response *</Label>
            <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} placeholder="Write your response to the guest..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!response || isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
