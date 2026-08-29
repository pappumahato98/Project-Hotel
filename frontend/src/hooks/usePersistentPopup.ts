import { useState, useCallback } from "react";
import { useUIPreferences } from "./useSettings";

/**
 * Hook to manage persistent popup state and animations.
 * Prevents closure on outside clicks or Escape key if enabled in UI preferences.
 */
export function usePersistentPopup() {
  const { data: uiPrefs } = useUIPreferences();
  const [isBlocking, setIsBlocking] = useState(false);

  const persistentEnabled = uiPrefs?.persistent_popups ?? true;

  const triggerBlockAnimation = useCallback(() => {
    if (!persistentEnabled) return;
    setIsBlocking(true);
    setTimeout(() => setIsBlocking(false), 400); // Duration matches animate-shake
  }, [persistentEnabled]);

  const handlePointerDownOutside = useCallback((e: Event) => {
    if (persistentEnabled) {
      // Don't prevent default if it's already being handled or if we want to allow some interop
      // but for pure persistence, preventDefault is key for Radix
      e.preventDefault();
      triggerBlockAnimation();
    }
  }, [persistentEnabled, triggerBlockAnimation]);

  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    if (persistentEnabled) {
      e.preventDefault();
      triggerBlockAnimation();
    }
  }, [persistentEnabled, triggerBlockAnimation]);

  const mergeHandlers = useCallback((customHandlers?: {
    onPointerDownOutside?: (e: any) => void;
    onEscapeKeyDown?: (e: any) => void;
  }) => {
    return {
      onPointerDownOutside: (e: any) => {
        handlePointerDownOutside(e);
        customHandlers?.onPointerDownOutside?.(e);
      },
      onEscapeKeyDown: (e: any) => {
        handleEscapeKeyDown(e);
        customHandlers?.onEscapeKeyDown?.(e);
      }
    };
  }, [handlePointerDownOutside, handleEscapeKeyDown]);

  return {
    isBlocking,
    handlePointerDownOutside,
    handleEscapeKeyDown,
    triggerBlockAnimation,
    mergeHandlers,
    persistentEnabled
  };
}
