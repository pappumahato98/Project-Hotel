import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { POSDashboard } from "@/components/pos/POSDashboard";
import { POSHeader } from "@/components/pos/POSHeader";

const POS = () => {
  return (
    <MainLayout fixedHeight title="Point of Sale" subtitle="Manage your restaurant and bar operations">
      <div className="flex flex-col h-full overflow-hidden">
        <POSHeader />
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
          <POSDashboard />
        </div>
      </div>
    </MainLayout>
  );
};

export default POS;
