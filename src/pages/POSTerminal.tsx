import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { POSHeader } from "@/components/pos/POSHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, ShoppingCart, CreditCard, ShieldCheck } from "lucide-react";
import { TableManagement } from "@/components/pos/terminal/TableManagement";
import { OrderManagement } from "@/components/pos/terminal/OrderManagement";
import { BillingSettlement } from "@/components/pos/terminal/BillingSettlement";
import { POSAuditDashboard } from "@/components/pos/terminal/POSAuditDashboard";

const POSTerminal = () => {
  const [activeTab, setActiveTab] = useState("tables");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleTableSelect = (orderId: string, tableId: string) => {
    setSelectedOrderId(orderId);
    setSelectedTableId(tableId);
    setActiveTab("order");
  };

  const handleGoToBilling = () => {
    setActiveTab("billing");
  };

  return (
    <MainLayout fixedHeight title="POS Terminal" subtitle="Operational terminal for table service">
      <div className="flex flex-col h-full overflow-hidden">
        <POSHeader />

        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-muted/20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-6 shrink-0">
              <TabsTrigger value="tables" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Table Management
              </TabsTrigger>
              <TabsTrigger value="order" className="gap-2" disabled={!selectedOrderId}>
                <ShoppingCart className="h-4 w-4" />
                Order Management
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2" disabled={!selectedOrderId}>
                <CreditCard className="h-4 w-4" />
                Billing & Settlement
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Ending Audit
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden min-h-0 relative">
              <TabsContent value="tables" className="h-full m-0">
                <TableManagement onSelectTable={handleTableSelect} />
              </TabsContent>

              <TabsContent value="order" className="h-full m-0">
                {selectedOrderId && (
                  <OrderManagement
                    orderId={selectedOrderId}
                    tableId={selectedTableId!}
                    onBilling={handleGoToBilling}
                  />
                )}
              </TabsContent>

              <TabsContent value="billing" className="h-full m-0">
                {selectedOrderId && (
                  <BillingSettlement
                    orderId={selectedOrderId}
                    tableId={selectedTableId!}
                    onComplete={() => {
                      setActiveTab("tables");
                      setSelectedOrderId(null);
                      setSelectedTableId(null);
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="audit" className="h-full m-0 overflow-y-auto">
                 <POSAuditDashboard />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default POSTerminal;
