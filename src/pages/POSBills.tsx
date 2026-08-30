import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { POSBillsTrack } from "@/components/pos/POSBillsTrack";
import { POSHeader } from "@/components/pos/POSHeader";

const POSBills = () => {
  return (
    <MainLayout fixedHeight title="Bills Track" subtitle="Manage and track all finalized bills">
      <div className="flex flex-col h-full overflow-hidden">
        <POSHeader />
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
          <POSBillsTrack />
        </div>
      </div>
    </MainLayout>
  );
};

export default POSBills;
