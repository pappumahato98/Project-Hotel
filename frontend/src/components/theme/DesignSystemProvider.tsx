import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useUIPreferences } from "@/hooks/useSettings";
import { useSidebar } from "@/hooks/use-sidebar";

const DesignSystemContext = createContext({});

export const useDesignSystem = () => useContext(DesignSystemContext);

export const DesignSystemProvider = ({ children }: { children: ReactNode }) => {
  const { data: prefs } = useUIPreferences();
  const { isMobile } = useSidebar();

  useEffect(() => {
    if (!prefs) return;

    const root = document.documentElement;

    // Inject CSS Variables for Materials
    root.style.setProperty("--ios-blur", `${prefs.blur_amount || 12}px`);
    root.style.setProperty("--ios-bg-opacity", `${prefs.background_opacity || 0.6}`);
    root.style.setProperty("--ios-saturation", `${(prefs.saturation || 1.2) * 100}%`);

    // Inject CSS Variables for Layout
    root.style.setProperty("--ios-radius", `${prefs.base_radius || 12}px`);
    root.style.setProperty("--ios-spacing", `${prefs.base_spacing || 4}px`);

    // Inject Theme Colors
    if (prefs.primary_color) {
      root.style.setProperty("--primary", prefs.primary_color);
    }

    // Inject Typography
    if (prefs.font_family_sans) {
      root.style.setProperty("--font-body", prefs.font_family_sans);
    }
    if (prefs.font_family_display) {
      root.style.setProperty("--font-display", prefs.font_family_display);
    }

    // Handle iOS class
    const iosEnabled = prefs.ios_materials && !(isMobile && prefs.disable_on_mobile);
    if (iosEnabled) {
      document.body.classList.add("ios-enabled");
    } else {
      document.body.classList.remove("ios-enabled");
    }

    // Handle animations
    if (!prefs.animations_enabled) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }

  }, [prefs]);

  return (
    <DesignSystemContext.Provider value={{ prefs }}>
      {children}
    </DesignSystemContext.Provider>
  );
};
