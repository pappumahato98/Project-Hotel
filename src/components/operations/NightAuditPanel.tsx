import React, { useState } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNightAudit } from "@/hooks/useNightAudit";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  CheckCircle2, AlertCircle, Moon, ArrowRight, Loader2, Play,
  Calendar, Users, History, FileText
} from "lucide-react";
import { cn, formatCurrency, formatAD } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

type AuditStep = 'validation' | 'posting' | 'closing' | 'summary';

export function NightAuditPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("audit");
  const { businessDate, isDateLoading, usePendingArrivals, useStayOvers, postCharges, closeDay } = useNightAudit();
  const [currentStep, setCurrentStep] = useState<AuditStep>('validation');
  const [auditProgress, setAuditProgress] = useState(0);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const { data: arrivals = [], isLoading: arrivalsLoading } = usePendingArrivals(businessDate || "");
  const { data: stayOvers = [], isLoading: stayOversLoading } = useStayOvers(businessDate || "");
  const [postedStats, setPostedStats] = useState<{ posted_count: number; total_revenue: number } | null>(null);

  // Dynamic room count
  const { data: totalRooms = 0 } = useQuery({
    queryKey: ["rooms-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("rooms").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Last audit from night_audit_logs
  const { data: lastAuditLog } = useQuery({
    queryKey: ["last-audit-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("night_audit_logs")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Audit history
  const { data: auditHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["audit-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("night_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const handleStartAudit = () => {
    setCurrentStep('validation');
    setAuditProgress(25);
  };

  const handlePostCharges = async () => {
    if (!businessDate) return;
    setCurrentStep('posting');
    setAuditProgress(50);
    try {
      const result = await postCharges.mutateAsync(businessDate);
      setPostedStats(result);
      setAuditProgress(75);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFinalizeClose = async () => {
    if (!businessDate || !postedStats) return;
    setCurrentStep('closing');
    const occupancyRate = totalRooms > 0 ? (stayOvers.length / totalRooms) * 100 : 0;
    await closeDay.mutateAsync({
      currentDate: businessDate,
      log: {
        total_charges_posted: postedStats.posted_count,
        total_room_revenue: postedStats.total_revenue,
        occupancy_rate: occupancyRate,
      }
    });
    setAuditProgress(100);
    setCurrentStep('summary');
  };

  const exportAuditPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Night Audit Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Business Date: ${businessDate || "N/A"}`, 14, 32);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);
    if (postedStats) {
      doc.text(`Charges Posted: ${postedStats.posted_count}`, 14, 50);
      doc.text(`Room Revenue: ${formatCurrency(postedStats.total_revenue)}`, 14, 56);
      doc.text(`Occupancy: ${stayOvers.length} / ${totalRooms} rooms`, 14, 62);
    }
    doc.save(`night-audit-${businessDate || "report"}.pdf`);
  };

  if (isDateLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col h-full overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-6">
          <TabsList>
            <TabsTrigger value="audit" className="gap-2"><Moon className="h-4 w-4" />Run Audit</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Audit History</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
            <TabsContent value="audit" className="mt-0 focus-visible:outline-none p-4 sm:p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Status */}
                <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-full">
                          <Moon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm opacity-70">Current Business Date</p>
                          <h2 className="text-3xl font-bold font-display">
                            {businessDate ? format(parseISO(businessDate), "EEEE, MMMM do, yyyy") : "---"}
                          </h2>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-white border-white/20 mb-2">System Status: Ready</Badge>
                        <p className="text-xs opacity-50">
                          Last Audit: {lastAuditLog?.business_date ? formatAD(lastAuditLog.business_date) : "No audits yet"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Wizard */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                      <CardTitle>Audit Wizard</CardTitle>
                      <span className="text-sm font-medium text-muted-foreground">Step {
                        currentStep === 'validation' ? '1' :
                        currentStep === 'posting' ? '2' :
                        currentStep === 'closing' ? '3' : '4'
                      } of 4</span>
                    </div>
                    <Progress value={auditProgress} className="h-2" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Step 1: Validation */}
                    {currentStep === 'validation' && auditProgress > 0 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-amber-600">Pending Actions Required</h4>
                            <p className="text-sm text-amber-700">Review arrivals before proceeding.</p>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Guest</TableHead>
                              <TableHead>Reservation #</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {arrivals.map((res: any) => (
                              <TableRow key={res.id}>
                                <TableCell className="font-medium">{res.guests?.first_name} {res.guests?.last_name}</TableCell>
                                <TableCell className="font-mono">{res.reservation_code}</TableCell>
                                <TableCell><Badge variant="outline">{res.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => navigate(`/reservations`)}>Manage</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {arrivals.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success opacity-50" />
                                  No pending arrivals for today.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button variant="outline" disabled>Back</Button>
                          <Button className="gap-2" onClick={handlePostCharges} disabled={arrivals.length > 0}>
                            Proceed to Posting <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Posting */}
                    {currentStep === 'posting' && (
                      <div className="space-y-6 py-8 text-center animate-in fade-in zoom-in-95">
                        {postCharges.isPending ? (
                          <div className="space-y-4">
                            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                            <div>
                              <h3 className="text-lg font-bold">Posting Room Charges...</h3>
                              <p className="text-muted-foreground">Updating guest folios.</p>
                            </div>
                          </div>
                        ) : postedStats ? (
                          <div className="space-y-6">
                            <div className="p-6 bg-success/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
                              <CheckCircle2 className="h-12 w-12 text-success" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold">Posting Completed</h3>
                              <p className="text-muted-foreground">Daily room rates applied to all stayovers.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                              <Card className="bg-secondary/20">
                                <CardContent className="pt-6">
                                  <p className="text-sm text-muted-foreground uppercase">Posted</p>
                                  <p className="text-2xl font-bold">{postedStats.posted_count}</p>
                                  <p className="text-xs text-muted-foreground">Folio Items</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-secondary/20">
                                <CardContent className="pt-6">
                                  <p className="text-sm text-muted-foreground uppercase">Revenue</p>
                                  <p className="text-2xl font-bold">{formatCurrency(postedStats.total_revenue)}</p>
                                  <p className="text-xs text-muted-foreground">Room Charges</p>
                                </CardContent>
                              </Card>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t">
                              <Button variant="outline" onClick={() => setCurrentStep('validation')}>Back</Button>
                              <Button className="gap-2" onClick={handleFinalizeClose}>
                                Proceed to Close Day <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Step 3: Closing */}
                    {currentStep === 'closing' && (
                      <div className="space-y-8 py-12 text-center animate-in fade-in">
                        <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                        <div>
                          <h3 className="text-2xl font-bold">Finalizing End of Day</h3>
                          <p className="text-muted-foreground">Updating business date and archiving logs...</p>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Summary */}
                    {currentStep === 'summary' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <div className="p-8 bg-success/5 border border-success/20 rounded-xl text-center space-y-4">
                          <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                            <Calendar className="h-10 w-10 text-success" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-success">Business Day Closed</h3>
                            <p className="text-muted-foreground">
                              System date advanced to <strong>{businessDate}</strong>.
                            </p>
                          </div>
                          <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => window.location.reload()}>Return to Dashboard</Button>
                            <Button onClick={exportAuditPDF} className="gap-2">
                              <FileText className="h-4 w-4" /> Export PDF
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Financials</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold">{formatCurrency(postedStats?.total_revenue || 0)}</p>
                              <p className="text-xs text-muted-foreground">Room Revenue</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" /> Occupancy
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold">{stayOvers.length} / {totalRooms}</p>
                              <p className="text-xs text-muted-foreground">{totalRooms > 0 ? Math.round((stayOvers.length / totalRooms) * 100) : 0}% Occupied</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold text-success">Success</p>
                              <p className="text-xs text-muted-foreground">Audit completed</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Welcome / Init Step */}
                    {currentStep === 'validation' && auditProgress === 0 && (
                      <div className="py-12 text-center space-y-6">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <Play className="h-10 w-10 text-primary" />
                        </div>
                        <div className="max-w-md mx-auto">
                          <h3 className="text-2xl font-bold">Ready to Begin?</h3>
                          <p className="text-muted-foreground mt-2">
                            The Night Audit process will validate transactions, post daily room rates,
                            and advance the hotel's business date.
                          </p>
                        </div>
                        <Button size="lg" className="px-12" onClick={handleStartAudit}>
                          Start Night Audit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Audit History Tab */}
            <TabsContent value="history" className="mt-0 focus-visible:outline-none p-4 sm:p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Audit History</CardTitle>
                  <CardDescription>Past night audit records from the database</CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : auditHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No audit history found. Run your first night audit to see records here.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business Date</TableHead>
                          <TableHead>Charges Posted</TableHead>
                          <TableHead>Room Revenue</TableHead>
                          <TableHead>Occupancy</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditHistory.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{formatAD(log.business_date)}</TableCell>
                            <TableCell>{log.total_charges_posted || 0}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(log.total_room_revenue || 0)}</TableCell>
                            <TableCell>{Math.round(log.occupancy_rate || 0)}%</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={log.status === 'completed' ? 'bg-success/10 text-success border-success/20' : ''}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatAD(log.created_at, "time")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}


