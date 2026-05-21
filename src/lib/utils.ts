import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as fnsFormat } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Standard AD date format: dd/MM/yyyy */
export const AD_DATE_FORMAT = "dd/MM/yyyy";

/** Standard AD datetime format: dd/MM/yyyy HH:mm */
export const AD_DATETIME_FORMAT = "dd/MM/yyyy HH:mm";

/** Standard AD datetime with seconds: dd/MM/yyyy HH:mm:ss */
export const AD_DATETIME_SEC_FORMAT = "dd/MM/yyyy HH:mm:ss";

/** Format a number as currency (NPR by default) */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "NPR",
  locale: string = "en-NP",
  standard: "national" | "international" = "international",
  display: "symbol" | "code" | "both" = "symbol",
  useDevanagari: boolean = false
): string {
  if (amount === null || amount === undefined) return "—";

  // For 'national' (Lakh/Crore) standard in Nepal/India
  const targetLocale = standard === "national" ? "en-IN" : locale;

  try {
    const formatter = new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency,
      currencyDisplay: display === "both" ? "symbol" : (display === "code" ? "code" : "symbol"),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    let result = formatter.format(amount);

    if (display === "both") {
      result = `${currency} ${result}`;
    }

    if (useDevanagari) {
      return toDevanagariDigits(result);
    }

    return result;
  } catch {
    // Fallback for unsupported locales
    const fallback = `${currency} ${amount.toLocaleString()}`;
    return useDevanagari ? toDevanagariDigits(fallback) : fallback;
  }
}

/** Format a large number with Lakh/Crore vs Million/Billion */
export function formatNumber(
  num: number,
  standard: "national" | "international" = "international",
  locale: string = "en-NP",
  useDevanagari: boolean = false
): string {
  const targetLocale = standard === "national" ? "en-IN" : locale;
  const result = new Intl.NumberFormat(targetLocale).format(num);
  return useDevanagari ? toDevanagariDigits(result) : result;
}

/** Utility to convert Latin digits to Devanagari */
export function toDevanagariDigits(num: number | string): string {
  const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)]);
}

/** Format a date in standard AD format (dd/MM/yyyy) */
export function formatAD(
  date: Date | string,
  withTime?: "time" | "seconds",
  timeFormat: "12h" | "24h" = "12h",
  baseFormat: string = AD_DATE_FORMAT
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  let formatString = baseFormat;
  if (withTime === "time") {
    formatString = timeFormat === "24h" ? `${baseFormat} HH:mm` : `${baseFormat} hh:mm a`;
  } else if (withTime === "seconds") {
    formatString = timeFormat === "24h" ? `${baseFormat} HH:mm:ss` : `${baseFormat} hh:mm:ss a`;
  }

  return fnsFormat(d, formatString);
}
