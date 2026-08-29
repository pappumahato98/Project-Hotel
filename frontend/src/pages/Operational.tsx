import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Wrench, Bell, Settings, Package, Bed, Lock, Moon
} from "lucide-react";

import { RoomsTab, TasksTab, InspectionsTab, LostFoundTab } from "@/components/housekeeping";
import { RequestsTab, PreventiveMaintenanceTab, AssetsTab } from "@/components/engineering";
import { ConciergePanel } from "@/components/operations/ConciergePanel";
import { DayClosePanel } from "@/components/operations/DayClosePanel";
import { NightAuditPanel } from "@/components/operations/NightAuditPanel";

const Operational = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "housekeeping";

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  return (
    <MainLayout fixedHeight title="Operational" subtitle="Unified dashboard for housekeeping, engineering, and core operations">
      <div className="flex flex-col h-full overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-6">
          <div className="px-4 sm:px-6">
            <TabsList>
              <TabsTrigger value="housekeeping" className="gap-2">
                <Bed className="h-4 w-4" />
                Housekeeping
              </TabsTrigger>
              <TabsTrigger value="engineering" className="gap-2">
                <Wrench className="h-4 w-4" />
                Engineering
              </TabsTrigger>
              <TabsTrigger value="concierge" className="gap-2">
                <Bell className="h-4 w-4" />
                Concierge
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <Settings className="h-4 w-4" />
                Asset Tracking
              </TabsTrigger>
              <TabsTrigger value="lost-found" className="gap-2">
                <Package className="h-4 w-4" />
                Lost & Found
              </TabsTrigger>
              <TabsTrigger value="day-close" className="gap-2">
                <Lock className="h-4 w-4" />
                Day Close
              </TabsTrigger>
              <TabsTrigger value="night-audit" className="gap-2">
                <Moon className="h-4 w-4" />
                Night Audit
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
            <TabsContent value="housekeeping" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <RoomsTab />
              </div>
            </TabsContent>

            <TabsContent value="engineering" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <RequestsTab />
              </div>
            </TabsContent>

            <TabsContent value="concierge" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <ConciergePanel />
              </div>
            </TabsContent>

            <TabsContent value="assets" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <AssetsTab />
              </div>
            </TabsContent>

            <TabsContent value="lost-found" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <LostFoundTab />
              </div>
            </TabsContent>

            <TabsContent value="day-close" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <DayClosePanel />
              </div>
            </TabsContent>

            <TabsContent value="night-audit" className="mt-0 h-full focus-visible:outline-none">
              <div className="h-full flex flex-col space-y-6">
                 <NightAuditPanel />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

const OperationalPage = () => (
  <ErrorBoundary>
    <Operational />
  </ErrorBoundary>
);

export default OperationalPage;
