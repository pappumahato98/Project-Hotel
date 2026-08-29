import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UIPreferences } from "@/hooks/useSettings";
import { Rocket, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { formatAD } from "@/lib/utils";

interface ReleaseWorkflowProps {
  livePrefs: UIPreferences | undefined;
  stagedPrefs: UIPreferences;
  onPublish: () => void;
}

export const ReleaseWorkflow = ({ livePrefs, stagedPrefs, onPublish }: ReleaseWorkflowProps) => {
  const hasChanges = JSON.stringify(livePrefs) !== JSON.stringify(stagedPrefs);

  return (
    <Card className="border-border/50 bg-secondary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          Release Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            <span>Current Live</span>
            {livePrefs?.last_published_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatAD(new Date(livePrefs.last_published_at), "time")}
              </span>
            )}
          </div>
          <div className="p-2 rounded bg-success/10 border border-success/20 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">Stable Version Active</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            <span>Staging Environment</span>
            <Badge variant="outline" className="h-4 text-[8px]">Draft</Badge>
          </div>

          {hasChanges ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">Unpublished Changes</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                You have modified UI tokens in the staging area. These changes are only visible to you until published.
              </p>
            </div>
          ) : (
            <div className="p-2 rounded bg-muted/50 border border-border/50 flex items-center gap-2 opacity-60">
              <Check className="h-3 w-3" />
              <span className="text-xs font-medium">In sync with live</span>
            </div>
          )}
        </div>

        <Button
          className="w-full gap-2 bg-success hover:bg-success/90 text-white shadow-lg shadow-success/10"
          disabled={!hasChanges}
          onClick={onPublish}
        >
          <Rocket className="h-4 w-4" />
          Deploy to Production
        </Button>
      </CardContent>
    </Card>
  );
};

const Check = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
