import React, { createContext, useContext, useState, ReactNode } from "react";
import { DynamicIsland } from "@/components/ui/ios/DynamicIsland";

interface DynamicIslandContextType {
  show: (message: string, type?: any, duration?: number) => void;
  hide: () => void;
}

const DynamicIslandContext = createContext<DynamicIslandContextType | undefined>(undefined);

export const useDynamicIsland = () => {
  const context = useContext(DynamicIslandContext);
  if (!context) throw new Error("useDynamicIsland must be used within DynamicIslandProvider");
  return context;
};

export const DynamicIslandProvider = ({ children }: { children: ReactNode }) => {
  const [island, setIsland] = useState<{ message: string; type: any; duration: number } | null>(null);

  const show = (message: string, type: any = "info", duration: number = 4000) => {
    setIsland({ message, type, duration });
  };

  const hide = () => setIsland(null);

  return (
    <DynamicIslandContext.Provider value={{ show, hide }}>
      {children}
      <DynamicIsland
        message={island?.message}
        type={island?.type}
        duration={island?.duration}
        onClose={hide}
      />
    </DynamicIslandContext.Provider>
  );
};
