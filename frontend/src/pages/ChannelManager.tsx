import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCurrency, formatAD } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { 
  Globe, Link2, RefreshCw, CheckCircle2, AlertCircle, Calendar,
  DollarSign, Settings, ExternalLink, Loader2, Plus, BarChart3, FileText, History
} from "lucide-react";
import { toast } from "sonner";
import { useOTAChannels, useChannelStats, useRateAvailability } from "@/hooks/useChannelManager";
import { useReportStats } from "@/hooks/useReportStats";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRooms } from "@/hooks/useRooms";

function ChannelManager() {
  const { data: channels = [], isLoading, toggleChannel, syncChannel, updateChannel } = useOTAChannels();
  const stats = useChannelStats();
  const { data: reportStats } = useReportStats();
  const { data: rooms = [] } = useRooms();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "channels";

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);

  // Sync logs from ota_sync_logs
  const { data: syncLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["ota-sync-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ota_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate avg sync time
  const avgSyncTime = syncLogs.length > 0 
    ? `${Math.round(syncLogs.filter((l: any) => l.status === 'success').length / Math.max(syncLogs.length, 1) * 100)}% success`
    : "No syncs yet";

  const handleSync = async (channelId: string) => {
    try {
      await syncChannel.mutateAsync(channelId);
      toast.success("Channel synchronized successfully");
    } catch {
      toast.error("Failed to synchronize channel");
    }
  };

  const handleToggle = async (channelId: string, connected: boolean) => {
    try {
      await toggleChannel.mutateAsync({ id: channelId, isActive: connected });
      toast.success(connected ? "Channel connected" : "Channel disconnected");
    } catch {
      toast.error("Failed to update channel status");
    }
  };

  const handleCommissionUpdate = async (channelId: string, rate: number) => {
    try {
      await updateChannel.mutateAsync({ id: channelId, commission_rate: rate });
      toast.success("Commission rate updated");
      setEditingChannel(null);
    } catch {
      toast.error("Failed to update commission");
    }
  };

  const totalBookings = reportStats?.reservationCount || 0;
  const totalRevenue = reportStats?.totalReservationRevenue || 0;

  return (
    <MainLayout fixedHeight title="Channel Manager" subtitle="Manage OTA connections and distribution">
      <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-4 sm:px-6 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Channels</p>
                <p className="text-2xl font-bold">{stats.activeChannels}/{stats.totalChannels}</p>
              </div>
              <Link2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sync Health</p>
                <p className="text-lg font-bold">{avgSyncTime}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-6">
        <TabsList>
          <TabsTrigger value="channels" className="gap-2"><Globe className="h-4 w-4" />Channels</TabsTrigger>
          <TabsTrigger value="rates" className="gap-2"><DollarSign className="h-4 w-4" />Rate Calendar</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><History className="h-4 w-4" />Sync Logs</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><BarChart3 className="h-4 w-4" />Reports</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {/* Channels Tab */}
        <TabsContent value="channels" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              channels.map((channel) => (
                <Card key={channel.id} variant="elevated" className={!channel.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{channel.name[0]}</span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{channel.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {channel.is_active ? (
                              <Badge className="bg-success/20 text-success border-success/30 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Active
                              </Badge>
                            ) : (
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />Disconnected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Switch checked={channel.is_active} onCheckedChange={(checked) => handleToggle(channel.id, checked)} disabled={toggleChannel.isPending} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {channel.is_active && (
                      <>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Commission</p>
                            <p className="text-lg font-semibold cursor-pointer hover:text-primary" onClick={() => setEditingChannel(channel)}>
                              {channel.commission_rate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className={`text-lg font-semibold ${channel.sync_status === "success" ? "text-success" : "text-amber-500"}`}>
                              {channel.sync_status || "Pending"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                          <span>Last sync: {channel.last_sync_at ? formatDistanceToNow(new Date(channel.last_sync_at), { addSuffix: true }) : "Never"}</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSync(channel.id)} disabled={syncChannel.isPending}>
                              <RefreshCw className={`h-3 w-3 ${syncChannel.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingChannel(channel)}>
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                    {!channel.is_active && (
                      <Button variant="outline" className="w-full" onClick={() => handleToggle(channel.id, true)} disabled={toggleChannel.isPending}>
                        <Link2 className="h-4 w-4 mr-2" />Connect Channel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Rate Calendar Tab */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Rate Calendar</CardTitle>
              <CardDescription>Room rates and availability by date. Click to edit rates per room.</CardDescription>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No rooms configured. Add rooms first.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Base Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room: any) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_number}</TableCell>
                        <TableCell>{room.room_type}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(room.price_per_night)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={room.status === 'available' ? 'text-success' : ''}>{room.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> OTA Sync Logs</CardTitle>
              <CardDescription>Real-time synchronization history</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : syncLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No sync logs yet. Sync a channel to see logs.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OTA</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.ota_name}</TableCell>
                        <TableCell><Badge variant="outline">{log.direction}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={log.status === 'success' ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">{log.message || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatAD(log.created_at, "time")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channels.filter(c => c.is_active).map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">{ch.name}</p>
                        <p className="text-xs text-muted-foreground">Commission: {ch.commission_rate}%</p>
                      </div>
                      <Badge className={ch.sync_status === 'success' ? 'bg-success/20 text-success' : 'bg-amber-500/20 text-amber-500'}>
                        {ch.sync_status || 'Pending'}
                      </Badge>
                    </div>
                  ))}
                  {channels.filter(c => c.is_active).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No active channels</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Commission Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Avg Commission Rate</span>
                    <span className="font-bold">{stats.avgCommission.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Est. Commission Cost</span>
                    <span className="font-bold text-destructive">{formatCurrency(totalRevenue * (stats.avgCommission / 100))}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Net Revenue (after commission)</span>
                    <span className="font-bold text-success">{formatCurrency(totalRevenue * (1 - stats.avgCommission / 100))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </div>
      </Tabs>
      </div>

      {/* Edit Channel Commission Dialog */}
      <Dialog open={!!editingChannel} onOpenChange={() => setEditingChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel: {editingChannel?.name}</DialogTitle>
            <DialogDescription>Update commission rate and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={editingChannel?.commission_rate || 0}
                onChange={(e) => setEditingChannel({ ...editingChannel, commission_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChannel(null)}>Cancel</Button>
            <Button onClick={() => editingChannel && handleCommissionUpdate(editingChannel.id, editingChannel.commission_rate)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function ChannelManagerPage() {
  return <ErrorBoundary><ChannelManager /></ErrorBoundary>;
}
