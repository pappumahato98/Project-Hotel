import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface QuickActionsState {
  newBookingOpen: boolean;
  newGuestOpen: boolean;
  newRoomOpen: boolean;
  newMaintenanceOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutsHelpOpen: boolean;
}

interface QuickActionsContextType extends QuickActionsState {
  setNewBookingOpen: (open: boolean) => void;
  setNewGuestOpen: (open: boolean) => void;
  setNewRoomOpen: (open: boolean) => void;
  setNewMaintenanceOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsHelpOpen: (open: boolean) => void;
  closeAll: () => void;
}

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(undefined);

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuickActionsState>({
    newBookingOpen: false,
    newGuestOpen: false,
    newRoomOpen: false,
    newMaintenanceOpen: false,
    commandPaletteOpen: false,
    shortcutsHelpOpen: false,
  });

  const navigate = useNavigate();

  const setNewBookingOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, newBookingOpen: open }));
  }, []);

  const setNewGuestOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, newGuestOpen: open }));
  }, []);

  const setNewRoomOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, newRoomOpen: open }));
  }, []);

  const setNewMaintenanceOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, newMaintenanceOpen: open }));
  }, []);

  const setCommandPaletteOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, commandPaletteOpen: open }));
  }, []);

  const setShortcutsHelpOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, shortcutsHelpOpen: open }));
  }, []);

  const closeAll = useCallback(() => {
    setState({
      newBookingOpen: false,
      newGuestOpen: false,
      newRoomOpen: false,
      newMaintenanceOpen: false,
      commandPaletteOpen: false,
      shortcutsHelpOpen: false,
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Command palette: Ctrl/Cmd + K
      if (ctrlKey && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // New booking: Ctrl/Cmd + N
      if (ctrlKey && e.key === "n") {
        e.preventDefault();
        setNewBookingOpen(true);
        return;
      }

      // New guest: Ctrl/Cmd + G
      if (ctrlKey && e.key === "g") {
        e.preventDefault();
        setNewGuestOpen(true);
        return;
      }

      // New room: Ctrl/Cmd + R
      if (ctrlKey && e.key === "r") {
        e.preventDefault();
        setNewRoomOpen(true);
        return;
      }

      // New maintenance: Ctrl/Cmd + M
      if (ctrlKey && e.key === "m") {
        e.preventDefault();
        setNewMaintenanceOpen(true);
        return;
      }

      // Navigate shortcuts (without ctrl)
      if (e.altKey) {
        switch (e.key) {
          case "h":
            e.preventDefault();
            navigate("/");
            break;
          case "r":
            e.preventDefault();
            navigate("/reservations");
            break;
          case "g":
            e.preventDefault();
            navigate("/guests");
            break;
          case "o":
            e.preventDefault();
            navigate("/rooms");
            break;
          case "b":
            e.preventDefault();
            navigate("/payments");
            break;
          case "s":
            e.preventDefault();
            navigate("/settings");
            break;
        }
      }

      // Show shortcuts help: ?
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
        return;
      }

      // Escape to close all dialogs
      if (e.key === "Escape") {
        closeAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, setNewBookingOpen, setNewGuestOpen, setNewRoomOpen, setNewMaintenanceOpen, setCommandPaletteOpen, setShortcutsHelpOpen, closeAll]);

  return (
    <QuickActionsContext.Provider
      value={{
        ...state,
        setNewBookingOpen,
        setNewGuestOpen,
        setNewRoomOpen,
        setNewMaintenanceOpen,
        setCommandPaletteOpen,
        setShortcutsHelpOpen,
        closeAll,
      }}
    >
      {children}
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error("useQuickActions must be used within a QuickActionsProvider");
  }
  return context;
}
