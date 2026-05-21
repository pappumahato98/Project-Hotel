import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, PieChart, Calendar, ArrowUpRight, ArrowDownRight,
  Target, ShieldCheck, FileText, Download, Briefcase, Users
} from "lucide-react";
import { useManagement } from "@/hooks/useManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";

const Management = () => {
  const { data: kpis, isLoading } = useManagement();
  const [activeTab, setActiveTab] = useState("performance");

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <MainLayout fixedHeight title="Management Console" subtitle="Executive overview and strategic insights">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-4 sm:px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
              <TabsTrigger value="segmentation">Market Analysis</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" /> Today</Button>
            <Button size="sm"><Download className="h-4 w-4 mr-2" /> Export Summary</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6 space-y-6">
        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-indigo-600 font-medium">Occupancy</CardDescription>
              <CardTitle className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-20" /> : `${kpis?.occupancy ?? 0}%`}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +2.4% vs Yesterday
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-600 font-medium">ADR</CardDescription>
              <CardTitle className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(kpis?.adr || 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" /> -1.1% vs Target
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-600 font-medium">RevPAR</CardDescription>
              <CardTitle className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(kpis?.revpar || 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +5.8% vs Last Year
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-600 font-medium">Total Revenue</CardDescription>
              <CardTitle className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-32" /> : formatCurrency(kpis?.totalRevenue || 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-blue-600 font-semibold uppercase tracking-wider">
                <Target className="h-3 w-3 mr-1" /> 92% of Daily Goal
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Segmentation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Market Segmentation</CardTitle>
              <CardDescription>Revenue distribution by guest type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={kpis?.marketSegmentation}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {kpis?.marketSegmentation.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Department Revenue</CardTitle>
              <CardDescription>Performance comparison across outlets</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[300px] w-full">
                  {isLoading ? <Skeleton className="h-full w-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Rooms', value: kpis?.roomRevenue },
                        { name: 'F&B', value: kpis?.fbRevenue },
                        { name: 'Other', value: kpis?.otherRevenue },
                      ]}>
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(val) => `$${val}`} />
                        <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Guest Movement Summary */}
        <Card>
          <CardHeader>
             <CardTitle>Guest Movement Summary</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {kpis?.guestMovement.map((m) => (
                  <div key={m.label} className="text-center">
                     <p className="text-sm text-muted-foreground capitalize">{m.label.replace(/([A-Z])/g, ' $1')}</p>
                     <p className="text-2xl font-bold">{m.count}</p>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Management;
