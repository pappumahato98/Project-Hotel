import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { POSHeader } from "@/components/pos";
import { POSCombinedHistory } from "@/components/pos/POSCombinedHistory";

export default function POSHistory() {
  return (
    <MainLayout fixedHeight title="POS Sales & History" subtitle="Consolidated transaction logs and performance analytics">
      <div className="flex flex-col h-full overflow-hidden">
        <POSHeader />
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
          <POSCombinedHistory />
        </div>
      </div>
    </MainLayout>
  );
}
