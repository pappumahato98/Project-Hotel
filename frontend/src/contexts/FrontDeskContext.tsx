import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface FrontDeskNotification {
  type: "success" | "error" | "info";
  message: string;
}

interface FrontDeskContextType {
  selectedGuestId: string | null;
  selectedReservationId: string | null;
  selectedFolioId: string | null;
  selectedInvoiceId: string | null;
  activeTab: string;
  notification: FrontDeskNotification | null;
  setSelectedGuestId: (id: string | null) => void;
  setSelectedReservationId: (id: string | null) => void;
  setSelectedFolioId: (id: string | null) => void;
  setSelectedInvoiceId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  goToInHouse: (reservationId?: string) => void;
  goToFolios: (folioId?: string, guestId?: string) => void;
  goToBilling: (invoiceId?: string) => void;
  refreshAll: () => void;
  showNotification: (type: FrontDeskNotification["type"], message: string) => void;
  clearNotification: () => void;
}

const FrontDeskContext = createContext<FrontDeskContextType | undefined>(undefined);

export const useFrontDeskContext = () => {
  const context = useContext(FrontDeskContext);
  if (!context) {
    throw new Error("useFrontDeskContext must be used within a FrontDeskProvider");
  }
  return context;
};

interface FrontDeskProviderProps {
  children: ReactNode;
}

export const FrontDeskProvider: React.FC<FrontDeskProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("inhouse");
  const [notification, setNotification] = useState<FrontDeskNotification | null>(null);

  const goToInHouse = useCallback((reservationId?: string) => {
    setActiveTab("inhouse");
    if (reservationId) {
      setSelectedReservationId(reservationId);
    }
    setSelectedFolioId(null);
    setSelectedInvoiceId(null);
  }, []);

  const goToFolios = useCallback((folioId?: string, guestId?: string) => {
    setActiveTab("folios");
    if (folioId) {
      setSelectedFolioId(folioId);
    }
    if (guestId) {
      setSelectedGuestId(guestId);
    }
    setSelectedReservationId(null);
    setSelectedInvoiceId(null);
  }, []);

  const goToBilling = useCallback((invoiceId?: string) => {
    setActiveTab("billing");
    if (invoiceId) {
      setSelectedInvoiceId(invoiceId);
    }
    setSelectedReservationId(null);
    setSelectedFolioId(null);
  }, []);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
    queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
  }, [queryClient]);

  const showNotification = useCallback((type: FrontDeskNotification["type"], message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const value: FrontDeskContextType = {
    selectedGuestId,
    selectedReservationId,
    selectedFolioId,
    selectedInvoiceId,
    activeTab,
    notification,
    setSelectedGuestId,
    setSelectedReservationId,
    setSelectedFolioId,
    setSelectedInvoiceId,
    setActiveTab,
    goToInHouse,
    goToFolios,
    goToBilling,
    refreshAll,
    showNotification,
    clearNotification,
  };

  return (
    <FrontDeskContext.Provider value={value}>
      {children}
    </FrontDeskContext.Provider>
  );
};