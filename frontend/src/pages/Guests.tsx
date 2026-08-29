import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Mail, Phone, Star, Grid, List, Users, MessageSquare, Award, Trophy, Loader2, Receipt, FileText, Clock, GitMerge, Zap, Search, Edit, Download, Settings, PhoneCall, PlusCircle, MinusCircle, Reply, TrendingUp } from "lucide-react";
import { useGuests, Guest } from "@/hooks/useGuests";
import { GuestDocuments } from "@/components/guests/GuestDocuments";
import { GuestHistoryTimeline } from "@/components/guests/GuestHistoryTimeline";
import { AutomatedMessaging } from "@/components/guests/AutomatedMessaging";
import { GuestMergeTool } from "@/components/guests/GuestMergeTool";
import { GuestProfilePanel } from "@/components/guests/GuestProfilePanel";
import { EditGuestDialog } from "@/components/guests/EditGuestDialog";
import { GuestPreferencesTab } from "@/components/guests/GuestPreferencesTab";
import { GuestCommunicationsTab } from "@/components/guests/GuestCommunicationsTab";
import { FeedbackResponseDialog } from "@/components/guests/FeedbackResponseDialog";
import { LoyaltyActionsDialog } from "@/components/guests/LoyaltyActionsDialog";
import { NewGuestDialog } from "@/components/quick-actions/NewGuestDialog";
import { useGuestFeedback, useLoyaltyMembers, useGuestStats, GuestFeedback, LoyaltyMember } from "@/hooks/useGuestManagement";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable, Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/skeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { formatAD, formatCurrency } from "@/lib/utils";
import { exportToExcel } from "@/lib/reportExport";
import { GuestReportsTab } from "@/components/guests/GuestReportsTab";

const statusColors = {
  vip: "bg-primary/20 text-primary border-primary/30",
  regular: "bg-secondary text-secondary-foreground border-border",
  new: "bg-success/20 text-success border-success/30",
};

const tierColors: Record<string, string> = {
  bronze: "bg-amber-700/20 text-amber-600",
  silver: "bg-slate-400/20 text-slate-300",
  gold: "bg-primary/20 text-primary",
  platinum: "bg-purple-500/20 text-purple-400",
};

const feedbackTypeColors: Record<string, string> = {
  review: "bg-blue-500/20 text-blue-400",
  complaint: "bg-destructive/20 text-destructive",
  suggestion: "bg-amber-500/20 text-amber-400",
  compliment: "bg-success/20 text-success",
};

const getGuestStatus = (guest: Guest): "vip" | "regular" | "new" => {
  if (guest.is_vip) return "vip";
  if ((guest.total_visits || 0) <= 1) return "new";
  return "regular";
};

const Guests = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "guests";
  const { data: guests = [], isLoading } = useGuests();
  const { data: feedback = [], createFeedback, respondToFeedback, updateStatus } = useGuestFeedback();
  const { data: loyaltyMembers = [], enrollMember, addPoints, redeemPoints } = useLoyaltyMembers();
  const stats = useGuestStats();

  const loyaltyMemberIds = useMemo(() => new Set(loyaltyMembers.map(m => m.guest_id)), [loyaltyMembers]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [newGuestOpen, setNewGuestOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [gridSearch, setGridSearch] = useState("");

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  // Feedback response dialog
  const [respondFeedback, setRespondFeedback] = useState<GuestFeedback | null>(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);

  // Loyalty actions
  const [loyaltyActionMember, setLoyaltyActionMember] = useState<LoyaltyMember | null>(null);
  const [loyaltyActionMode, setLoyaltyActionMode] = useState<"add" | "redeem">("add");
  const [loyaltyDialogOpen, setLoyaltyDialogOpen] = useState(false);

  const [newFeedback, setNewFeedback] = useState({
    feedback_type: "review",
    department: "",
    rating: 5,
    title: "",
    message: "",
  });

  const filteredGuests = useMemo(() => {
    if (!gridSearch) return guests;
    const s = gridSearch.toLowerCase();
    return guests.filter(g =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(s) ||
      g.email?.toLowerCase().includes(s) ||
      g.phone?.includes(s)
    );
  }, [guests, gridSearch]);

  const columns: Column<Guest>[] = [
    {
      key: "first_name",
      header: "Guest",
      render: (guest) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedGuest(guest)}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={guest.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs">
              {guest.first_name[0]}{guest.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium flex items-center gap-2">
              {guest.first_name} {guest.last_name}
              {guest.is_vip && <Star className="h-3 w-3 text-primary fill-primary" />}
            </span>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (guest) => <span className="text-muted-foreground">{guest.email || "-"}</span> },
    { key: "phone", header: "Phone", render: (guest) => <span className="text-muted-foreground">{guest.phone || "-"}</span> },
    { key: "total_visits", header: "Visits", render: (guest) => <span className="font-semibold">{guest.total_visits || 0}</span> },
    { key: "total_spending", header: "Total Spent", render: (guest) => <span className="font-semibold text-primary">{formatCurrency(guest.total_spending || 0)}</span> },
    {
      key: "is_vip",
      header: "Status",
      sortable: false,
      render: (guest) => {
        const status = getGuestStatus(guest);
        return <Badge variant="outline" className={statusColors[status]}>{status.toUpperCase()}</Badge>;
      },
    },
    {
      key: "id",
      header: "Actions",
      sortable: false,
      render: (guest) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedGuest(guest); setEditDialogOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/front-desk?guestId=${guest.id}`)}>
            <Receipt className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEnrollLoyalty = async (guestId: string) => {
    try {
      await enrollMember.mutateAsync(guestId);
      toast.success("Guest enrolled in loyalty program");
    } catch (error) {
      toast.error("Failed to enroll guest");
    }
  };

  const handleAddFeedback = async () => {
    if (!selectedGuest) return;
    try {
      // @ts-expect-error - feedback type mismatch
      await createFeedback.mutateAsync({ ...newFeedback, guest_id: selectedGuest.id, status: "pending" });
      toast.success("Feedback recorded");
      setFeedbackDialogOpen(false);
      setNewFeedback({ feedback_type: "review", department: "", rating: 5, title: "", message: "" });
    } catch (error) {
      toast.error("Failed to record feedback");
    }
  };

  const handleRespondToFeedback = async (id: string, response: string) => {
    try {
      await respondToFeedback.mutateAsync({ id, response, respondedBy: "staff" });
      toast.success("Response sent");
    } catch (error) {
      toast.error("Failed to send response");
    }
  };

  const handleAddPoints = async (memberId: string, points: number, description: string) => {
    try {
      await addPoints.mutateAsync({ memberId, points, description });
      toast.success(`${points} points added`);
    } catch (error) {
      toast.error("Failed to add points");
    }
  };

  const handleRedeemPoints = async (memberId: string, points: number, description: string) => {
    try {
      await redeemPoints.mutateAsync({ memberId, points, description });
      toast.success(`${points} points redeemed`);
    } catch (error: any) {
      toast.error(error.message || "Failed to redeem points");
    }
  };

  const handleExportGuests = () => {
    exportToExcel({
      title: "Guest_List",
      headers: ["First Name", "Last Name", "Email", "Phone", "Visits", "Total Spent", "VIP"],
      rows: guests.map((g) => [
        g.first_name, g.last_name, g.email || "", g.phone || "",
        g.total_visits || 0, g.total_spending || 0, g.is_vip ? "Yes" : "No",
      ]),
    });
  };

  return (
    <MainLayout fixedHeight title="Guest Management" subtitle="Guest profiles, loyalty, and feedback">
      <ErrorBoundary>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full overflow-hidden space-y-6">
          <div className="px-4 sm:px-6">
          <TabsList>
            <TabsTrigger value="guests" className="gap-2"><Users className="h-4 w-4" />Guests</TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />Feedback
              {stats.pendingFeedback > 0 && <Badge variant="destructive" className="ml-1">{stats.pendingFeedback}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-2"><Award className="h-4 w-4" />Loyalty</TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2"><Settings className="h-4 w-4" />Preferences</TabsTrigger>
            <TabsTrigger value="communications" className="gap-2"><PhoneCall className="h-4 w-4" />Communications</TabsTrigger>
            <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Documents</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><Clock className="h-4 w-4" />History</TabsTrigger>
            <TabsTrigger value="messaging" className="gap-2"><Zap className="h-4 w-4" />Messaging</TabsTrigger>
            <TabsTrigger value="dedup" className="gap-2"><GitMerge className="h-4 w-4" />De-dup</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><TrendingUp className="h-4 w-4" />Reports</TabsTrigger>
          </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
          {/* === Guests Tab === */}
          <TabsContent value="guests" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                  <Grid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportGuests}>
                  <Download className="h-4 w-4" /> Export
                </Button>
                <Button variant="blue" size="sm" className="gap-2 w-full sm:w-auto" onClick={() => setNewGuestOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Guest
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className={selectedGuest && viewMode === "grid" ? "lg:col-span-3" : "lg:col-span-4"}>
                {isLoading ? (
                  <TableSkeleton columns={6} rows={5} />
                ) : viewMode === "table" ? (
                  <Card variant="elevated">
                    <CardHeader><CardTitle>All Guests ({guests.length})</CardTitle></CardHeader>
                    <CardContent>
                      <DataTable data={guests} columns={columns} keyExtractor={(guest) => guest.id} searchPlaceholder="Search guests..." emptyMessage="No guests found." pageSize={10} onRowClick={(g) => setSelectedGuest(g)} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search guests by name, email, phone..." value={gridSearch} onChange={(e) => setGridSearch(e.target.value)} className="pl-9" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                      {filteredGuests.map((guest, index) => {
                        const status = getGuestStatus(guest);
                        const isMember = loyaltyMemberIds.has(guest.id);
                        return (
                          <Card key={guest.id} variant="elevated" className={`animate-slide-up hover:shadow-glow transition-all cursor-pointer ${selectedGuest?.id === guest.id ? "ring-2 ring-primary" : ""}`} style={{ animationDelay: `${index * 50}ms` }} onClick={() => setSelectedGuest(guest)}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={guest.avatar_url || ""} />
                                    <AvatarFallback className="bg-gradient-blue text-primary-foreground font-semibold">{guest.first_name[0]}{guest.last_name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                      {guest.first_name} {guest.last_name}
                                      {guest.is_vip && <Star className="h-4 w-4 text-primary fill-primary" />}
                                    </h3>
                                    <Badge variant="outline" className={statusColors[status]}>{status.toUpperCase()}</Badge>
                                  </div>
                                </div>
                                {isMember && <Trophy className="h-5 w-5 text-primary" />}
                              </div>
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{guest.email || "-"}</div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{guest.phone || "-"}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border mb-4">
                                <div><p className="text-xs text-muted-foreground">Visits</p><p className="text-lg font-semibold text-foreground">{guest.total_visits || 0}</p></div>
                                <div><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-lg font-semibold text-primary">{formatCurrency(guest.total_spending || 0)}</p></div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]" onClick={(e) => { e.stopPropagation(); setSelectedGuest(guest); setEditDialogOpen(true); }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                                <Button variant="outline" size="sm" className="flex-1 min-w-[80px]" onClick={(e) => { e.stopPropagation(); setSelectedGuest(guest); setFeedbackDialogOpen(true); }}><MessageSquare className="h-4 w-4 mr-1" />Feedback</Button>
                                {!isMember && (
                                  <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); handleEnrollLoyalty(guest.id); }}><Award className="h-4 w-4 mr-1" />Enroll</Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {filteredGuests.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No guests found</div>}
                    </div>
                  </div>
                )}
              </div>
              {selectedGuest && viewMode === "grid" && (
                <div className="lg:col-span-1">
                  <GuestProfilePanel guest={selectedGuest} onEdit={() => setEditDialogOpen(true)} onViewDocuments={() => handleTabChange("documents")} onViewHistory={() => handleTabChange("history")} onClose={() => setSelectedGuest(null)} />
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Feedback Tab === */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Feedback</p><p className="text-2xl font-bold">{stats.totalFeedback}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-500">{stats.pendingFeedback}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Avg Rating</p><p className="text-2xl font-bold text-primary">{stats.avgRating.toFixed(1)} ★</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Loyalty Members</p><p className="text-2xl font-bold text-success">{stats.loyaltyMembers}</p></CardContent></Card>
            </div>
            <Card variant="elevated">
              <CardHeader><CardTitle>Guest Feedback</CardTitle><CardDescription>Reviews, complaints, and suggestions</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No feedback yet</TableCell></TableRow>
                    ) : feedback.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.guest ? `${f.guest.first_name} ${f.guest.last_name}` : "Anonymous"}</TableCell>
                        <TableCell><Badge className={feedbackTypeColors[f.feedback_type]}>{f.feedback_type}</Badge></TableCell>
                        <TableCell>{f.rating ? `${f.rating} ★` : "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{f.message}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">{f.response || "—"}</TableCell>
                        <TableCell>
                          <Badge className={f.status === "pending" ? "bg-amber-500/20 text-amber-400" : f.status === "resolved" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>
                            {f.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatAD(new Date(f.created_at))}</TableCell>
                        <TableCell>
                          {f.status === "pending" && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setRespondFeedback(f); setRespondDialogOpen(true); }}>
                                <Reply className="h-4 w-4 mr-1" /> Respond
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: f.id, status: "resolved" })}>
                                Resolve
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === Loyalty Tab === */}
          <TabsContent value="loyalty" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Members</p><p className="text-2xl font-bold">{stats.loyaltyMembers}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Platinum</p><p className="text-2xl font-bold text-purple-400">{stats.platinumMembers}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Gold</p><p className="text-2xl font-bold text-primary">{stats.goldMembers}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active Rate</p><p className="text-2xl font-bold text-success">{guests.length > 0 ? ((stats.loyaltyMembers / guests.length) * 100).toFixed(0) : 0}%</p></CardContent></Card>
            </div>
            <Card variant="elevated">
              <CardHeader><CardTitle>Loyalty Members</CardTitle><CardDescription>Reward program members and their tiers</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Member #</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Points Balance</TableHead>
                      <TableHead>Lifetime Points</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loyaltyMembers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No loyalty members yet</TableCell></TableRow>
                    ) : loyaltyMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.guest ? `${m.guest.first_name} ${m.guest.last_name}` : "-"}</TableCell>
                        <TableCell className="font-mono">{m.member_number}</TableCell>
                        <TableCell><Badge className={tierColors[m.tier]}>{m.tier.toUpperCase()}</Badge></TableCell>
                        <TableCell className="font-semibold">{m.points_balance.toLocaleString()}</TableCell>
                        <TableCell>{m.lifetime_points.toLocaleString()}</TableCell>
                        <TableCell>{formatAD(new Date(m.join_date))}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setLoyaltyActionMember(m); setLoyaltyActionMode("add"); setLoyaltyDialogOpen(true); }}>
                              <PlusCircle className="h-4 w-4 text-success" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setLoyaltyActionMember(m); setLoyaltyActionMode("redeem"); setLoyaltyDialogOpen(true); }}>
                              <MinusCircle className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === Preferences Tab === */}
          <TabsContent value="preferences"><GuestPreferencesTab guests={guests} /></TabsContent>

          {/* === Communications Tab === */}
          <TabsContent value="communications"><GuestCommunicationsTab guests={guests} /></TabsContent>

          {/* === Documents Tab === */}
          <TabsContent value="documents" className="space-y-6">
            {!selectedGuest ? (
              <Card variant="elevated">
                <CardHeader><CardTitle>Select a Guest</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {guests.map((g) => (
                      <Button key={g.id} variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setSelectedGuest(g)}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={g.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs">{g.first_name[0]}{g.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-left"><p className="font-medium">{g.first_name} {g.last_name}</p><p className="text-xs text-muted-foreground">{g.email || g.phone || "No contact"}</p></div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Documents for {selectedGuest.first_name} {selectedGuest.last_name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedGuest(null)}>Change Guest</Button>
                </div>
                <GuestDocuments guestId={selectedGuest.id} guestName={`${selectedGuest.first_name} ${selectedGuest.last_name}`} />
              </>
            )}
          </TabsContent>

          {/* === History Tab === */}
          <TabsContent value="history" className="space-y-6">
            {!selectedGuest ? (
              <Card variant="elevated">
                <CardHeader><CardTitle>Select a Guest</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {guests.map((g) => (
                      <Button key={g.id} variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setSelectedGuest(g)}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={g.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs">{g.first_name[0]}{g.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-left"><p className="font-medium">{g.first_name} {g.last_name}</p><p className="text-xs text-muted-foreground">{g.email || g.phone || "No contact"}</p></div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">History for {selectedGuest.first_name} {selectedGuest.last_name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedGuest(null)}>Change Guest</Button>
                </div>
                <GuestHistoryTimeline guestId={selectedGuest.id} guestName={`${selectedGuest.first_name} ${selectedGuest.last_name}`} />
              </>
            )}
          </TabsContent>

          <TabsContent value="messaging" className="mt-0 focus-visible:outline-none"><AutomatedMessaging /></TabsContent>
          <TabsContent value="dedup" className="mt-0 focus-visible:outline-none"><GuestMergeTool /></TabsContent>
          <TabsContent value="reports" className="mt-0 focus-visible:outline-none"><GuestReportsTab /></TabsContent>
          </div>
        </Tabs>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Guest Feedback</DialogTitle>
              <DialogDescription>{selectedGuest ? `For ${selectedGuest.first_name} ${selectedGuest.last_name}` : ""}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newFeedback.feedback_type} onValueChange={(v) => setNewFeedback({ ...newFeedback, feedback_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="compliment">Compliment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Select value={newFeedback.rating.toString()} onValueChange={(v) => setNewFeedback({ ...newFeedback, rating: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5].map((r) => <SelectItem key={r} value={r.toString()}>{r} ★</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={newFeedback.department || "none"} onValueChange={(v) => setNewFeedback({ ...newFeedback, department: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Department</SelectItem>
                    <SelectItem value="front_desk">Front Desk</SelectItem>
                    <SelectItem value="housekeeping">Housekeeping</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="spa">Spa</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Title</Label><Input value={newFeedback.title} onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Message *</Label><Textarea value={newFeedback.message} onChange={(e) => setNewFeedback({ ...newFeedback, message: e.target.value })} rows={4} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddFeedback} disabled={!newFeedback.message || createFeedback.isPending}>
                {createFeedback.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FeedbackResponseDialog feedback={respondFeedback} open={respondDialogOpen} onOpenChange={setRespondDialogOpen} onRespond={handleRespondToFeedback} isPending={respondToFeedback.isPending} />
        <LoyaltyActionsDialog member={loyaltyActionMember} mode={loyaltyActionMode} open={loyaltyDialogOpen} onOpenChange={setLoyaltyDialogOpen} onAddPoints={handleAddPoints} onRedeemPoints={handleRedeemPoints} isPending={addPoints.isPending || redeemPoints.isPending} />
        <NewGuestDialog open={newGuestOpen} onOpenChange={setNewGuestOpen} />
        <EditGuestDialog guest={selectedGuest} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      </ErrorBoundary>
    </MainLayout>
  );
};

export default Guests;
