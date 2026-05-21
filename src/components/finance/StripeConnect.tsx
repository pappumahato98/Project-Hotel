import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const StripeConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsLoading(true);
    // Simulate Stripe Connect flow
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      toast({
        title: "Stripe Connected",
        description: "Your account has been successfully linked with Stripe.",
      });
    }, 2000);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Stripe Connect</CardTitle>
              <CardDescription>Accept payments and manage payouts</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "success" : "outline"} className="gap-1">
            {isConnected ? (
              <><CheckCircle2 className="h-3 w-3" /> Connected</>
            ) : (
              <><AlertCircle className="h-3 w-3" /> Not Connected</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Link your hotel's bank account to start accepting credit card payments from guests.
          We use Stripe for secure payment processing and automated payouts.
        </p>

        {isConnected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Account ID</span>
                <span className="text-sm font-mono text-muted-foreground">acct_1H4z...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <span className="text-sm text-success font-medium">Active</span>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              View Stripe Dashboard
            </Button>
          </div>
        ) : (
          <Button
            variant="blue"
            className="w-full gap-2"
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Connect with Stripe
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
