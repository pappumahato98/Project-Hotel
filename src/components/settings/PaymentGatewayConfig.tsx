import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Settings,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Wallet,
  Building2,
  Globe,
} from "lucide-react";
import {
  usePaymentGateways,
  useUpdatePaymentGateway,
  useTogglePaymentGateway,
  PaymentGatewayConfig as GatewayConfig,
} from "@/hooks/usePaymentGateways";

const gatewayIcons: Record<string, React.ReactNode> = {
  esewa: <Wallet className="h-5 w-5 text-primary" />,
  khalti: <Wallet className="h-5 w-5 text-primary" />,
  connectips: <Building2 className="h-5 w-5 text-primary" />,
  fonepay: <CreditCard className="h-5 w-5 text-primary" />,
  stripe: <Globe className="h-5 w-5 text-primary" />,
  razorpay: <CreditCard className="h-5 w-5 text-primary" />,
};

const gatewayDocs: Record<string, string> = {
  esewa: "https://developer.esewa.com.np/",
  khalti: "https://docs.khalti.com/",
  connectips: "https://connectips.com/",
  fonepay: "https://fonepay.com/merchant",
  stripe: "https://stripe.com/docs",
  razorpay: "https://razorpay.com/docs",
};

export const PaymentGatewayConfigPanel = () => {
  const { data: gatewaysData, isLoading } = usePaymentGateways();
  const updateGateway = useUpdatePaymentGateway();
  const toggleGateway = useTogglePaymentGateway();

  const [selectedGateway, setSelectedGateway] = useState<GatewayConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    api_key: "",
    secret_key: "",
    merchant_id: "",
    sandbox_mode: true,
    webhook_url: "",
  });

  const handleConfigClick = (gateway: GatewayConfig) => {
    setSelectedGateway(gateway);
    setFormData({
      api_key: gateway.api_key || "",
      secret_key: gateway.secret_key || "",
      merchant_id: gateway.merchant_id || "",
      sandbox_mode: gateway.sandbox_mode ?? true,
      webhook_url: gateway.webhook_url || "",
    });
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedGateway) return;

    let isConfigured = false;
    if (selectedGateway.id === 'stripe') {
      isConfigured = !!(formData.api_key && formData.secret_key);
    } else if (selectedGateway.id === 'razorpay') {
      isConfigured = !!(formData.merchant_id && formData.secret_key);
    } else {
      isConfigured = !!(formData.api_key || formData.merchant_id);
    }

    updateGateway.mutate({
      ...selectedGateway,
      ...formData,
      is_configured: isConfigured,
    });
    setConfigDialogOpen(false);
  };

  const handleToggle = (gatewayId: string, enabled: boolean) => {
    const gateway = gatewaysData?.gateways.find(g => g.id === gatewayId);
    if (gateway && !gateway.is_configured && enabled) {
      handleConfigClick(gateway);
      return;
    }
    toggleGateway.mutate({ gatewayId, enabled });
  };

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const gateways = gatewaysData?.gateways || [];
  const nationalGateways = gateways.filter(g => g.type === 'national');
  const internationalGateways = gateways.filter(g => g.type === 'international');

  const GatewayItem = ({ gateway }: { gateway: GatewayConfig }) => (
    <div
      key={gateway.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/70 transition-colors"
    >
      <div className="flex items-start sm:items-center gap-4">
        <div className="p-2 rounded-lg bg-background shadow-sm shrink-0 mt-1 sm:mt-0">
          {gatewayIcons[gateway.id] || <CreditCard className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium whitespace-nowrap">{gateway.name}</p>
            <Badge variant="outline" className="text-[10px] h-4">
              {gateway.code}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-none">{gateway.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {gateway.is_configured ? (
              <Badge className="bg-success/10 text-success border-success/20 text-[10px] py-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px] py-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
            {gateway.sandbox_mode && gateway.is_configured && (
              <Badge variant="outline" className="text-[10px] py-0">
                Sandbox
              </Badge>
            )}
            {gateway.enabled && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0">
                Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 sm:flex-none"
          onClick={() => handleConfigClick(gateway)}
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Configure
        </Button>
        <Switch
          checked={gateway.enabled}
          onCheckedChange={(enabled) => handleToggle(gateway.id, enabled)}
          disabled={!gateway.is_configured}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 px-1 sm:px-0">
      <div className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_4px_20px_rgba(0,102,255,0.3)]" />
        </div>
        <div className="relative flex flex-col items-center gap-4 px-4 text-center">
          <div className="bg-background px-4 sm:px-8 py-3 rounded-full border-2 border-primary/20 shadow-elevated flex items-center gap-2 sm:gap-3 group hover:border-primary/40 transition-all duration-500 max-w-full">
            <div className="p-1 rounded-full bg-primary/10 group-hover:rotate-180 transition-transform duration-700 shrink-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-foreground uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">
              National Gateway Systems
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            Local digital wallets and interbank systems
          </p>
        </div>
      </div>

      <Card variant="elevated" className="border-primary/20 shadow-glow">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4">
            {nationalGateways.map((gateway) => (
              <GatewayItem key={gateway.id} gateway={gateway} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_4px_20px_rgba(0,102,255,0.3)]" />
        </div>
        <div className="relative flex flex-col items-center gap-4 px-4 text-center">
          <div className="bg-background px-4 sm:px-8 py-3 rounded-full border-2 border-primary/20 shadow-elevated flex items-center gap-2 sm:gap-3 group hover:border-primary/40 transition-all duration-500 max-w-full">
            <div className="p-1 rounded-full bg-primary/10 group-hover:rotate-180 transition-transform duration-700 shrink-0">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-foreground uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">
              International Gateway Systems
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            Global credit card and multi-currency processing
          </p>
        </div>
      </div>

      <Card variant="elevated" className="border-primary/20 shadow-glow">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4">
            {internationalGateways.map((gateway) => (
              <GatewayItem key={gateway.id} gateway={gateway} />
            ))}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              💡 International gateways require valid SSL certificates and PCI compliance on your production domain.
              Ensure your merchant account is approved for cross-border transactions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGateway && gatewayIcons[selectedGateway.id]}
              Configure {selectedGateway?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials from the {selectedGateway?.name} developer portal.
              {selectedGateway && gatewayDocs[selectedGateway.id] && (
                <a
                  href={gatewayDocs[selectedGateway.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline ml-1 font-medium"
                >
                  View documentation <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="merchant_id">
                {selectedGateway?.id === 'razorpay' ? 'Key ID' :
                 selectedGateway?.id === 'stripe' ? 'Account ID (Optional)' :
                 'Merchant ID / Code'}
              </Label>
              <Input
                id="merchant_id"
                value={formData.merchant_id}
                onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                placeholder={selectedGateway?.id === 'razorpay' ? 'rzp_test_...' : 'Enter your merchant ID'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">
                {selectedGateway?.id === 'stripe' ? 'Publishable Key' :
                 selectedGateway?.id === 'razorpay' ? 'Public Key (Optional)' :
                 'API Key / Public Key'}
              </Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showSecrets.api_key ? "text" : "password"}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder={selectedGateway?.id === 'stripe' ? 'pk_test_...' : 'Enter your public key'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility("api_key")}
                >
                  {showSecrets.api_key ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret_key">
                {selectedGateway?.id === 'stripe' ? 'Secret Key' :
                 selectedGateway?.id === 'razorpay' ? 'Key Secret' :
                 'Secret Key / Private Key'}
              </Label>
              <div className="relative">
                <Input
                  id="secret_key"
                  type={showSecrets.secret_key ? "text" : "password"}
                  value={formData.secret_key}
                  onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                  placeholder={selectedGateway?.id === 'stripe' ? 'sk_test_...' : 'Enter your secret key'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility("secret_key")}
                >
                  {showSecrets.secret_key ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL (Optional)</Label>
              <Input
                id="webhook_url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://your-domain.com/api/webhook"
              />
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                Webhook endpoint for real-time payment notifications
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
              <div>
                <p className="text-sm font-medium">Sandbox / Test Mode</p>
                <p className="text-xs text-muted-foreground">
                  Use test environment for development
                </p>
              </div>
              <Switch
                checked={formData.sandbox_mode}
                onCheckedChange={(checked) => setFormData({ ...formData, sandbox_mode: checked })}
              />
            </div>

            {!formData.sandbox_mode && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Production mode enabled. Real transactions will be processed.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateGateway.isPending}>
              {updateGateway.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
