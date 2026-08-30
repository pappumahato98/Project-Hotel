import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  Database,
  Key,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
  Zap,
  Plus,
  Trash2,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAPIKeysSettings, useUpdateAPIKeysSettings, APIKey } from "@/hooks/useSettings";

interface BucketStatus {
  id: string;
  exists: boolean;
  public: boolean;
}

export const MCPConfigPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { data: apiKeysData } = useAPIKeysSettings();
  const updateAPIKeys = useUpdateAPIKeysSettings();

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [keyFormData, setKeyFormData] = useState<APIKey>({
    name: "",
    key: "",
    description: "",
    is_secret: true
  });

  const [status, setStatus] = useState<{
    buckets: BucketStatus[];
    realtimeEnabled: boolean;
    projectId: string;
  }>({
    buckets: [],
    realtimeEnabled: false,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || "unknown",
  });

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      // 1. Check Buckets
      const requiredBuckets = ['avatars', 'property-images', 'lost-found-images'];
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

      if (bucketsError) throw bucketsError;

      const bucketStatus = requiredBuckets.map(id => {
        const found = buckets?.find(b => b.id === id);
        return {
          id,
          exists: !!found,
          public: found?.public ?? false
        };
      });

      // 2. Check Realtime (We can't directly check the publication easily,
      // so we check if we can subscribe to a common table)
      const testChannel = supabase.channel('mcp-status-check');
      let realtimeOk = false;

      try {
        const subscription = testChannel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {})
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') realtimeOk = true;
          });

        // Wait a bit for subscription
        await new Promise(resolve => setTimeout(resolve, 1000));
        await supabase.removeChannel(testChannel);
      } catch (e) {
        realtimeOk = false;
      }

      setStatus(prev => ({
        ...prev,
        buckets: bucketStatus,
        realtimeEnabled: realtimeOk,
      }));

    } catch (error) {
      console.error("Status check failed:", error);
      toast.error("Failed to fetch system status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConfigureBuckets = async () => {
    setIsLoading(true);
    try {
      for (const bucketId of ['avatars', 'property-images', 'lost-found-images']) {
        const { error } = await supabase.storage.createBucket(bucketId, {
          public: true,
        });
        if (error && error.message !== 'Bucket already exists') {
          throw error;
        }
      }
      toast.success("Storage buckets configured");
      await checkStatus();
    } catch (error) {
      toast.error("Failed to configure buckets: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const mcpConfigJson = JSON.stringify({
    name: "LuxeStay ERP Supabase MCP",
    version: "1.0.0",
    supabase: {
      project_id: status.projectId,
      realtime: true,
      storage: status.buckets.map(b => b.id),
      custom_keys: (apiKeysData?.keys || []).map(k => k.name)
    }
  }, null, 2);

  const handleAddOrEditKey = (key?: APIKey) => {
    if (key) {
      setEditingKey(key);
      setKeyFormData(key);
    } else {
      setEditingKey(null);
      setKeyFormData({ name: "", key: "", description: "", is_secret: true });
    }
    setConfigDialogOpen(true);
  };

  const handleSaveKey = async () => {
    if (!keyFormData.name || !keyFormData.key) {
      toast.error("Name and Key are required");
      return;
    }

    const currentKeys = apiKeysData?.keys || [];
    let newKeys: APIKey[];

    if (editingKey) {
      newKeys = currentKeys.map(k => k.name === editingKey.name ? keyFormData : k);
    } else {
      if (currentKeys.find(k => k.name === keyFormData.name)) {
        toast.error("A key with this name already exists");
        return;
      }
      newKeys = [...currentKeys, keyFormData];
    }

    try {
      await updateAPIKeys.mutateAsync({ keys: newKeys });
      setConfigDialogOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDeleteKey = async (name: string) => {
    const newKeys = (apiKeysData?.keys || []).filter(k => k.name !== name);
    try {
      await updateAPIKeys.mutateAsync({ keys: newKeys });
    } catch (error) {
      // Error handled by hook
    }
  };

  const toggleSecretVisibility = (name: string) => {
    setShowSecrets(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Status */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  MCP Readiness
                </CardTitle>
                <CardDescription>Supabase project configuration status</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={checkStatus} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Realtime Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Zap className={`h-5 w-5 ${status.realtimeEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium text-sm">Realtime Sync</p>
                  <p className="text-xs text-muted-foreground">Postgres CDC status</p>
                </div>
              </div>
              <Badge variant="outline" className={status.realtimeEnabled ? "bg-success/20 text-success border-success/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                {status.realtimeEnabled ? "Enabled" : "Not Detected"}
              </Badge>
            </div>

            {/* Buckets Status */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase px-1">Storage Buckets</p>
              {status.buckets.map(bucket => (
                <div key={bucket.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{bucket.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {bucket.exists ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-xs">{bucket.exists ? "Configured" : "Missing"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                className="w-full"
                onClick={handleConfigureBuckets}
                disabled={isLoading || status.buckets.every(b => b.exists)}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Auto-Configure Resources
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Auth Configuration Guide */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Auth Configuration
            </CardTitle>
            <CardDescription>Fixing "missing OAuth secret" errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Standard Google OAuth requires manual configuration in your Supabase Dashboard.
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-medium">Setup Steps:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to <a href={`https://supabase.com/dashboard/project/${status.projectId}/auth/providers`} target="_blank" rel="noreferrer" className="text-primary hover:underline">Auth Providers</a></li>
                <li>Find and expand the <span className="font-semibold text-foreground">Google</span> provider.</li>
                <li>Ensure it is <span className="font-semibold text-foreground">Enabled</span>.</li>
                <li>Enter your <span className="font-semibold text-foreground">Client ID</span> and <span className="font-semibold text-foreground">Client Secret</span>.</li>
                <li>Add your app URL to <span className="font-semibold text-foreground">Authorized Redirect URIs</span> in Google Console.</li>
              </ol>
            </div>

            <div className="pt-2">
              <Button variant="blue" className="w-full gap-2" asChild>
                <a href={`https://supabase.com/dashboard/project/${status.projectId}/auth/providers`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Configure Google Provider
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Credentials & Details */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Project Details
            </CardTitle>
            <CardDescription>Required for external MCP host</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Supabase Project ID</Label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs font-mono truncate">{status.projectId}</code>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(status.projectId, "Project ID")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API URL</Label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs font-mono truncate">{import.meta.env.VITE_SUPABASE_URL}</code>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(import.meta.env.VITE_SUPABASE_URL, "API URL")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>
                To enable full write access for the MCP host, you must also provide your <strong>Service Role Key</strong>.
                Keep this key secret and only share it with trusted MCP providers.
              </p>
            </div>

            <div className="pt-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`https://supabase.com/dashboard/project/${status.projectId}/settings/api`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Supabase API Settings
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Management */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Keys & Secrets
              </CardTitle>
              <CardDescription>Manage API keys and external service credentials</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleAddOrEditKey()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!apiKeysData || apiKeysData.keys.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No custom keys configured yet.</p>
              </div>
            ) : (
              apiKeysData.keys.map((key) => (
                <div key={key.name} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="space-y-1 flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{key.name}</p>
                      {key.is_secret && <Badge variant="outline" className="text-[10px] h-4">Secret</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground font-mono truncate bg-background px-1 rounded">
                        {key.is_secret && !showSecrets[key.name] ? "••••••••••••••••" : key.key}
                      </code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(key.key, key.name)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      {key.is_secret && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleSecretVisibility(key.name)}>
                          {showSecrets[key.name] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    {key.description && <p className="text-xs text-muted-foreground">{key.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAddOrEditKey(key)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteKey(key.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* MCP.json Preview */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>mcp.json Preview</CardTitle>
              <CardDescription>Configuration for compatible agents</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(mcpConfigJson, "mcp.json")}>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-48">
            {mcpConfigJson}
          </pre>
        </CardContent>
      </Card>
      {/* Key Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKey ? "Modify Key" : "Add New Key"}</DialogTitle>
            <DialogDescription>
              Store a system-wide key or secret in the configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                placeholder="e.g. STRIPE_SECRET_KEY"
                value={keyFormData.name}
                onChange={(e) => setKeyFormData({ ...keyFormData, name: e.target.value })}
                disabled={!!editingKey}
              />
            </div>

            <div className="space-y-2">
              <Label>Key Value</Label>
              <Input
                placeholder="Enter value"
                value={keyFormData.key}
                onChange={(e) => setKeyFormData({ ...keyFormData, key: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="What is this key used for?"
                value={keyFormData.description}
                onChange={(e) => setKeyFormData({ ...keyFormData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <p className="text-sm font-medium">Mask Value</p>
                <p className="text-xs text-muted-foreground">Hide value by default in the UI</p>
              </div>
              <Switch
                checked={keyFormData.is_secret}
                onCheckedChange={(checked) => setKeyFormData({ ...keyFormData, is_secret: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveKey} disabled={updateAPIKeys.isPending}>
              {updateAPIKeys.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              {editingKey ? "Save Changes" : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
