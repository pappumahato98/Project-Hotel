import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Target, PhoneCall, Mail, Calendar, TrendingUp, Plus,
  Search, Filter, CheckCircle2, Clock, MapPin, Building
} from "lucide-react";
import { useMarketing, MarketingInquiry, SalesActivity } from "@/hooks/useMarketing";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

const Marketing = () => {
  const { inquiries, salesActivities } = useMarketing();
  const [activeTab, setActiveTab] = useState("inquiries");

  return (
    <MainLayout fixedHeight title="Sales & Marketing" subtitle="Campaigns, inquiries, and corporate accounts">
      <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
          <TabsList>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="activities">Sales Activities</TabsTrigger>
            <TabsTrigger value="accounts">Corporate Accounts</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 h-9" />
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Entry</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-6 mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Inquiries</p>
                  <p className="text-2xl font-bold">{inquiries.data?.filter(i => i.status === 'new').length || 0}</p>
                </div>
              </CardContent>
            </Card>
            {/* Add more KPI cards here */}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Recent Inquiries</CardTitle>
                <CardDescription>Direct leads and group booking requests</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inquiries.isLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : inquiries.data?.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No inquiries found.</div>
                ) : (
                  inquiries.data?.map((inquiry) => (
                    <div key={inquiry.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {inquiry.client_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{inquiry.client_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" /> {inquiry.company_name || "Private"}
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px] h-4 uppercase">{inquiry.inquiry_type}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={inquiry.status === 'new' ? 'default' : 'secondary'}>{inquiry.status}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(inquiry.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Activity Log</CardTitle>
              <CardDescription>Tracking visits, calls, and meetings</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                {salesActivities.isLoading ? (
                   Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : (
                  salesActivities.data?.map((activity) => (
                    <div key={activity.id} className="flex gap-4 p-4 rounded-lg border">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                         {activity.activity_type === 'visit' ? <MapPin className="h-5 w-5" /> :
                          activity.activity_type === 'call' ? <PhoneCall className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start">
                            <p className="font-semibold">{activity.account_name}</p>
                            <span className="text-xs text-muted-foreground">{activity.activity_date}</span>
                         </div>
                         <p className="text-sm text-muted-foreground line-clamp-1">{activity.purpose}</p>
                         <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{activity.activity_type}</Badge>
                            <span className="text-[10px] text-green-600 font-medium">{activity.outcome}</span>
                         </div>
                      </div>
                    </div>
                  ))
                )}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Corporate Accounts Placeholder */}
        <TabsContent value="accounts" className="mt-0 focus-visible:outline-none">
          <Card>
            <CardHeader><CardTitle>Corporate Portfolios</CardTitle></CardHeader>
            <CardContent><div className="py-12 text-center text-muted-foreground italic">Corporate accounts management dashboard coming soon...</div></CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
      </div>
    </MainLayout>
  );
};

export default Marketing;
