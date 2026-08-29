import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useLocalizationSettings } from "@/hooks/useSettings";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatNumber, formatAD } from "@/lib/utils";
import { todayBS, formatBSDate, adToBS } from "@/lib/nepaliDate";

interface LocalizationContextType {
  calendarMode: "AD" | "BS";
  language: "en" | "np";
  numberStandard: "national" | "international";
  currency: string;
  formatAmount: (amount: number | null | undefined) => string;
  formatSimpleNumber: (num: number) => string;
  formatDate: (date: Date | string, withTime?: "time" | "seconds") => string;
  t: any;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useLocalizationSettings();
  const { i18n, t } = useTranslation();

  useEffect(() => {
    if (settings?.language) {
      i18n.changeLanguage(settings.language);

      // Update document lang and class for font switching
      document.documentElement.lang = settings.language;
      if (settings.language === 'np') {
        document.body.classList.add('font-nepali');
      } else {
        document.body.classList.remove('font-nepali');
      }
    }
  }, [settings?.language, i18n]);

  const formatAmount = useCallback((amount: number | null | undefined) => {
    return formatCurrency(
      amount,
      settings?.currency || "NPR",
      settings?.language === "np" ? "ne-NP" : "en-NP",
      settings?.number_standard || "international",
      settings?.currency_display || "symbol",
      settings?.digit_standard === "devanagari"
    );
  }, [settings]);

  const formatSimpleNumber = useCallback((num: number) => {
    return formatNumber(
      num,
      settings?.number_standard || "international",
      settings?.language === "np" ? "ne-NP" : "en-NP",
      settings?.digit_standard === "devanagari"
    );
  }, [settings]);

  const formatDate = useCallback((date: Date | string, withTime?: "time" | "seconds") => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    const timeFormat = settings?.time_format || "12h";
    const bsFormat = settings?.date_format_bs || "short";
    const adFormat = settings?.date_format_ad || "dd/MM/yyyy";

    if (settings?.calendar_mode === "BS") {
      try {
        const bsDate = adToBS(d);
        return formatBSDate(bsDate, withTime ? "long" : bsFormat);
      } catch (e) {
        return formatAD(d, withTime, timeFormat, adFormat);
      }
    }
    return formatAD(d, withTime, timeFormat, adFormat);
  }, [settings]);

  return (
    <LocalizationContext.Provider value={{
      calendarMode: settings?.calendar_mode || "AD",
      language: settings?.language || "en",
      numberStandard: settings?.number_standard || "international",
      currency: settings?.currency || "NPR",
      formatAmount,
      formatSimpleNumber,
      formatDate,
      t,
    }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error("useLocalization must be used within a LocalizationProvider");
  }
  return context;
};
