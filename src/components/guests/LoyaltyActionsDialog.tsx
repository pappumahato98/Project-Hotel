import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { LoyaltyMember } from "@/hooks/useGuestManagement";

interface Props {
  member: LoyaltyMember | null;
  mode: "add" | "redeem";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPoints: (memberId: string, points: number, description: string) => Promise<void>;
  onRedeemPoints: (memberId: string, points: number, description: string) => Promise<void>;
  isPending: boolean;
}

export function LoyaltyActionsDialog({ member, mode, open, onOpenChange, onAddPoints, onRedeemPoints, isPending }: Props) {
  const [points, setPoints] = useState(0);
  const [description, setDescription] = useState("");

  if (!member) return null;

  const handleSubmit = async () => {
    if (mode === "add") {
      await onAddPoints(member.id, points, description);
    } else {
      await onRedeemPoints(member.id, points, description);
    }
    setPoints(0);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Points" : "Redeem Points"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-secondary rounded-lg flex justify-between">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className="font-bold">{member.points_balance.toLocaleString()} pts</span>
          </div>
          <div className="space-y-2">
            <Label>Points *</Label>
            <Input type="number" min={1} max={mode === "redeem" ? member.points_balance : undefined} value={points || ""} onChange={(e) => setPoints(parseInt(e.target.value) || 0)} />
            {mode === "redeem" && points > member.points_balance && (
              <p className="text-xs text-destructive">Insufficient points</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={mode === "add" ? "e.g. Stay bonus points" : "e.g. Room upgrade redemption"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!points || !description || isPending || (mode === "redeem" && points > member.points_balance)}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "add" ? "Add Points" : "Redeem Points"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
