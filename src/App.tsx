import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DesignSystemProvider } from "@/components/theme/DesignSystemProvider";
import { DynamicIslandProvider } from "@/components/ui/ios/DynamicIslandProvider";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { QuickActionsProvider } from "@/contexts/QuickActionsContext";
import { GlobalQuickActions } from "@/components/quick-actions";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RealtimeListener } from "@/components/layout/RealtimeListener";
import { Suspense, lazy } from "react";
import { BobbingDots } from "@/components/ui/bobbing-dots";

// Eager load auth & index (critical path)
import Auth from "./pages/Auth";
import Index from "./pages/Index";

// Lazy load all other pages
const Reservations = lazy(() => import("./pages/Reservations"));
const ReservationCalendar = lazy(() => import("./pages/ReservationCalendar"));
const Guests = lazy(() => import("./pages/Guests"));
const FrontDesk = lazy(() => import("./pages/FrontDesk"));

const Inventory = lazy(() => import("./pages/Inventory"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const DevPanel = lazy(() => import("./pages/DevPanel"));
const AdminConsole = lazy(() => import("./pages/AdminConsole"));
const POS = lazy(() => import("./pages/POS"));
const POSTerminal = lazy(() => import("./pages/POSTerminal"));
const POSClock = lazy(() => import("./pages/POSClock"));
const POSBills = lazy(() => import("./pages/POSBills"));
const POSHistory = lazy(() => import("./pages/POSHistory"));
const KitchenDisplay = lazy(() => import("./pages/KitchenDisplay"));
const HRM = lazy(() => import("./pages/HRM"));
const ChannelManager = lazy(() => import("./pages/ChannelManager"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const Finance = lazy(() => import("./pages/Finance"));
const NewJournalEntry = lazy(() => import("./pages/NewJournalEntry"));
const Banquet = lazy(() => import("./pages/Banquet"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Management = lazy(() => import("./pages/Management"));
const Operational = lazy(() => import("./pages/Operational"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min stale time
      gcTime: 1000 * 60 * 15, // 15 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <BobbingDots />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SidebarProvider>
            <LocalizationProvider>
            <DesignSystemProvider>
            <DynamicIslandProvider>
            <QuickActionsProvider>
              <RealtimeListener />
              <GlobalQuickActions />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
                  <Route path="/guests" element={<ProtectedRoute><Guests /></ProtectedRoute>} />
                  <Route path="/front-desk" element={<ProtectedRoute><FrontDesk /></ProtectedRoute>} />
                  <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
                  <Route path="/pos/terminal" element={<ProtectedRoute><POSTerminal /></ProtectedRoute>} />
                  <Route path="/pos/clock" element={<ProtectedRoute><POSClock /></ProtectedRoute>} />
                  <Route path="/pos/bills" element={<ProtectedRoute><POSBills /></ProtectedRoute>} />
                  <Route path="/pos/history" element={<ProtectedRoute><POSHistory /></ProtectedRoute>} />
                  <Route path="/pos/kitchen" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                  <Route path="/channel-manager" element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                  <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
                  <Route path="/hrm" element={<ProtectedRoute><HRM /></ProtectedRoute>} />
                  <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
                  <Route path="/finance/journal/new" element={<ProtectedRoute><NewJournalEntry /></ProtectedRoute>} />
                  <Route path="/banquet" element={<ProtectedRoute><Banquet /></ProtectedRoute>} />
                  <Route path="/operations" element={<ProtectedRoute><Operational /></ProtectedRoute>} />
                  <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
                  <Route path="/management" element={<ProtectedRoute><Management /></ProtectedRoute>} />
                  <Route path="/dev" element={<ProtectedRoute><DevPanel /></ProtectedRoute>} />
                  <Route path="/admin-console" element={<ProtectedRoute><AdminConsole /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </QuickActionsProvider>
            </DynamicIslandProvider>
            </DesignSystemProvider>
            </LocalizationProvider>
            </SidebarProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
