import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSearchParams } from "react-router-dom";
import { useUIPreferences } from "@/hooks/useSettings";
import {
  Package, Truck, Warehouse, ArrowUpDown, FolderTree,
  ArrowRightLeft, BarChart3, Settings2, ClipboardList,
  ChefHat, Trash2, Ruler, Store, ScanLine, ListChecks,
  Boxes, Settings, ArrowUpRight, Utensils, ShieldCheck, Undo2,
  ShoppingCart, Activity, DollarSign
} from "lucide-react";
import {
  ItemsTab, CategoriesTab, SuppliersTab, PurchaseOrdersTab,
  StockMovementsTab, TransfersTab, ReportsTab,
  UoMTab, StoresTab, RequisitionsTab, RecipesTab,
  WastageTab, StockCountTab, InventorySettingsTab, StockIssueTab,
  InventoryValuationReport, ExpiryReport, FoodCostReport,
  ApprovalsQueueTab, ReturnsTab, ReplenishmentTab, InventoryDashboard,
  ItemLedgerReport, PriceComparisonReport, ProductionOrdersTab,
  InventoryAuditLogs, StockByStoreReport
} from "@/components/inventory";
import { cn } from "@/lib/utils";

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const navGroups = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "setup", label: "Setup", icon: Settings2 },
    { id: "transactions", label: "Transactions", icon: ArrowRightLeft },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "admin", label: "Administration", icon: ShieldCheck },
  ];

  const subTabs = {
    dashboard: [
      { id: "overview", label: "Overview", icon: BarChart3 },
    ],
    setup: [
      { id: "items", label: "Item Master", icon: Package },
      { id: "categories", label: "Categories", icon: FolderTree },
      { id: "uoms", label: "Units & Conversions", icon: Ruler },
      { id: "stores", label: "Store Management", icon: Store },
      { id: "suppliers", label: "Supplier Management", icon: Truck },
      { id: "recipes", label: "Recipe / BOM", icon: ChefHat },
      { id: "settings", label: "Configuration", icon: Settings },
    ],
    transactions: [
      { id: "approvals", label: "Approvals", icon: ShieldCheck },
      { id: "requisitions", label: "Requisitions", icon: ClipboardList },
      { id: "orders", label: "Purchase Orders", icon: ShoppingCart },
      { id: "grn", label: "Goods Receiving (GRN)", icon: Warehouse },
      { id: "issue", label: "Stock Issue", icon: ArrowUpRight },
      { id: "transfers", label: "Stock Transfer", icon: ArrowRightLeft },
      { id: "returns", label: "Stock Returns", icon: Undo2 },
      { id: "adjustments", label: "Adjustments", icon: ArrowUpDown },
      { id: "stock-count", label: "Stock Counting", icon: ListChecks },
      { id: "production", label: "Production Logs", icon: ChefHat },
    ],
    reports: [
      { id: "stock-rpt", label: "Stock Reports", icon: Package },
      { id: "stock-by-store", label: "Stock by Location", icon: Warehouse },
      { id: "item-ledger", label: "Item Ledger", icon: ClipboardList },
      { id: "movement-rpt", label: "Movement Reports", icon: ArrowUpDown },
      { id: "consumption-rpt", label: "Consumption", icon: Activity },
      { id: "purchase-rpt", label: "Purchasing Reports", icon: ShoppingCart },
      { id: "price-comparison", label: "Price Analysis", icon: DollarSign },
      { id: "valuation", label: "Financial Reports", icon: DollarSign },
    ],
    admin: [
      { id: "audit-logs", label: "Audit Logs", icon: ClipboardList },
      { id: "workflows", label: "Approval Workflows", icon: ShieldCheck },
    ]
  };

  const activeSubTab = searchParams.get("tab") || (searchParams.get("group") === "dashboard" ? "overview" : "items");

  // Derive mainTab from activeSubTab if not explicitly set
  const derivedGroup = Object.entries(subTabs).find(([_, tabs]) =>
    tabs.some(t => (t as any).id === activeSubTab)
  )?.[0] || "transactions";

  const mainTab = searchParams.get("group") || derivedGroup;

  const handleGroupChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("group", value);
      // Set default sub-tab for the group
      if (value === "dashboard") prev.set("tab", "overview");
      else if (value === "setup") prev.set("tab", "items");
      else if (value === "transactions") prev.set("tab", "requisitions");
      else if (value === "reports") prev.set("tab", "stock-rpt");
      else if (value === "admin") prev.set("tab", "audit-logs");
      return prev;
    });
  };

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };


  const { data: uiPrefs } = useUIPreferences();
  const isHorizontalNav = uiPrefs?.navigation_style === "horizontal-subheader";

  return (
    <MainLayout fixedHeight title="Inventory Management" subtitle="Comprehensive stock control for all departments">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Main Navigation Groups */}
        <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg self-start flex-shrink-0 mb-6">
          {navGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupChange(group.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md",
                mainTab === group.id
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <group.icon className="h-4 w-4" />
              {group.label}
            </button>
          ))}
        </div>
        </div>

        <ErrorBoundary>
          <Tabs value={activeSubTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
            {mainTab !== "dashboard" && (
              <div className="overflow-x-auto pb-2 flex-shrink-0">
                <TabsList className="bg-muted/30 border shadow-sm">
                  {(subTabs[mainTab as keyof typeof subTabs] || []).map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="gap-2 shrink-0">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
               {/* Dashboard */}
               <TabsContent value="overview" className="mt-0 focus-visible:outline-none"><InventoryDashboard /></TabsContent>

               {/* Setup */}
               <TabsContent value="items" className="mt-0 focus-visible:outline-none"><ItemsTab /></TabsContent>
               <TabsContent value="categories" className="mt-0 focus-visible:outline-none"><CategoriesTab /></TabsContent>
               <TabsContent value="uoms" className="mt-0 focus-visible:outline-none"><UoMTab /></TabsContent>
               <TabsContent value="stores" className="mt-0 focus-visible:outline-none"><StoresTab /></TabsContent>
               <TabsContent value="suppliers" className="mt-0 focus-visible:outline-none"><SuppliersTab /></TabsContent>
               <TabsContent value="recipes" className="mt-0 focus-visible:outline-none"><RecipesTab /></TabsContent>
               <TabsContent value="settings" className="mt-0 focus-visible:outline-none"><InventorySettingsTab /></TabsContent>

               {/* Transactions */}
               <TabsContent value="approvals" className="mt-0 focus-visible:outline-none"><ApprovalsQueueTab /></TabsContent>
               <TabsContent value="requisitions" className="mt-0 focus-visible:outline-none"><RequisitionsTab /></TabsContent>
               <TabsContent value="orders" className="mt-0 focus-visible:outline-none"><PurchaseOrdersTab /></TabsContent>
               <TabsContent value="grn" className="mt-0 focus-visible:outline-none"><PurchaseOrdersTab /></TabsContent>
               <TabsContent value="issue" className="mt-0 focus-visible:outline-none"><StockIssueTab /></TabsContent>
               <TabsContent value="transfers" className="mt-0 focus-visible:outline-none"><TransfersTab /></TabsContent>
               <TabsContent value="returns" className="mt-0 focus-visible:outline-none"><ReturnsTab /></TabsContent>
               <TabsContent value="adjustments" className="mt-0 focus-visible:outline-none"><WastageTab /></TabsContent>
               <TabsContent value="stock-count" className="mt-0 focus-visible:outline-none"><StockCountTab /></TabsContent>
               <TabsContent value="production" className="mt-0 focus-visible:outline-none"><ProductionOrdersTab /></TabsContent>

               {/* Reports */}
               <TabsContent value="stock-rpt" className="mt-0 focus-visible:outline-none"><ReportsTab /></TabsContent>
               <TabsContent value="stock-by-store" className="mt-0 focus-visible:outline-none"><StockByStoreReport /></TabsContent>
               <TabsContent value="movement-rpt" className="mt-0 focus-visible:outline-none"><StockMovementsTab /></TabsContent>
               <TabsContent value="consumption-rpt" className="mt-0 focus-visible:outline-none"><ReportsTab /></TabsContent>
               <TabsContent value="purchase-rpt" className="mt-0 focus-visible:outline-none"><ReportsTab /></TabsContent>
               <TabsContent value="valuation" className="mt-0 focus-visible:outline-none"><InventoryValuationReport /></TabsContent>
               <TabsContent value="item-ledger" className="mt-0 focus-visible:outline-none"><ItemLedgerReport /></TabsContent>
               <TabsContent value="price-comparison" className="mt-0 focus-visible:outline-none"><PriceComparisonReport /></TabsContent>

               {/* Admin */}
               <TabsContent value="audit-logs" className="mt-0 focus-visible:outline-none"><InventoryAuditLogs /></TabsContent>
               <TabsContent value="workflows" className="mt-0 focus-visible:outline-none"><ApprovalsQueueTab /></TabsContent>
            </div>
          </Tabs>
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
};

export default Inventory;
