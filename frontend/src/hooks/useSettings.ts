import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { navItems, operationsNavItems, adminNavItems } from "@/config/navigation";
import { queryKeys } from "@/lib/queryKeys";

// Type definitions for all settings
export interface CheckInFieldSettings {
  id_required: boolean;
  phone_required: boolean;
  email_required: boolean;
}

export interface PaymentSettings {
  cash_enabled: boolean;
  card_enabled: boolean;
  bank_transfer_enabled: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
}

export interface BookingSource {
  id: string;
  name: string;
  enabled: boolean;
  commission_percentage: number;
}

export interface BookingSourcesSettings {
  sources: BookingSource[];
}

export interface RatePlan {
  id: string;
  name: string;
  description: string;
  discount_percentage: number;
  enabled: boolean;
}

export interface RatePlansSettings {
  plans: RatePlan[];
}

export interface PropertySettings {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

export interface NotificationSettings {
  new_booking_alerts: boolean;
  checkin_reminders: boolean;
  low_inventory_alerts: boolean;
  payment_notifications: boolean;
  daily_summary: boolean;
}

export interface QuickMenuSettings {
  enabled_items: string[];
}

export interface ModulePermission {
  view: boolean;
  write: boolean;
  delete: boolean;
  report: boolean;
  enabled: boolean;
}

export interface UserRolesSettingsData {
  modules: Record<string, ModulePermission>;
  global_enabled: boolean;
}

export interface UIPreferences {
  ios_materials: boolean;
  glass_intensity: "low" | "medium" | "high";
  animations_enabled: boolean;
  disable_on_mobile: boolean;
  // Typography
  font_family_sans: string;
  font_family_display: string;
  base_font_size: number;
  // Spacing & Shape
  base_radius: number;
  base_spacing: number;
  // Colors
  primary_color: string;
  accent_color: string;
  // Material Advanced
  blur_amount: number;
  background_opacity: number;
  saturation: number;
  // Animations
  animation_preset: "linear" | "smooth" | "spring" | "none";
  sidebar_dropdowns_enabled: boolean;
  navigation_style: "default" | "vertical-icon" | "hidden-hover" | "horizontal-subheader";
  persistent_popups: boolean;
  standardize_page_dropdowns: boolean;
  // Release Management
  is_staged: boolean;
  last_published_at?: string;
}

export interface UITemplate {
  id: string;
  name: string;
  description?: string;
  preferences: UIPreferences;
  is_system: boolean;
}

export interface UITemplatesSettings {
  templates: UITemplate[];
}

export interface APIKey {
  name: string;
  key: string;
  description?: string;
  is_secret: boolean;
}

export interface APIKeysSettings {
  keys: APIKey[];
}

export interface LocalizationSettings {
  calendar_mode: "AD" | "BS";
  language: "en" | "np";
  number_standard: "national" | "international";
  currency: string;
  time_format: "12h" | "24h";
  first_day_of_week: 0 | 1; // 0 for Sunday, 1 for Monday
  measurement_system: "metric" | "imperial";
  currency_display: "symbol" | "code" | "both";
  fiscal_year_start_month: number; // 1-12
  digit_standard: "latin" | "devanagari";
  date_format_bs: "short" | "long" | "nepali";
  date_format_ad: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
  timezone: string;
}

// Default values
const defaultCheckInSettings: CheckInFieldSettings = {
  id_required: true,
  phone_required: false,
  email_required: false,
};

const defaultPaymentSettings: PaymentSettings = {
  cash_enabled: true,
  card_enabled: true,
  bank_transfer_enabled: false,
  require_deposit: false,
  deposit_percentage: 20,
};

const defaultBookingSources: BookingSourcesSettings = {
  sources: [
    { id: "direct", name: "Direct Booking", enabled: true, commission_percentage: 0 },
    { id: "booking_com", name: "Booking.com", enabled: true, commission_percentage: 15 },
    { id: "expedia", name: "Expedia", enabled: false, commission_percentage: 18 },
    { id: "airbnb", name: "Airbnb", enabled: false, commission_percentage: 3 },
  ],
};

const defaultRatePlans: RatePlansSettings = {
  plans: [
    { id: "standard", name: "Standard Rate", description: "Regular pricing", discount_percentage: 0, enabled: true },
    { id: "early_bird", name: "Early Bird", description: "Book 30+ days in advance", discount_percentage: 15, enabled: true },
    { id: "last_minute", name: "Last Minute", description: "Book within 48 hours", discount_percentage: 10, enabled: false },
    { id: "weekly", name: "Weekly Stay", description: "7+ night stays", discount_percentage: 20, enabled: true },
  ],
};

const defaultPropertySettings: PropertySettings = {
  name: "LuxeStay Grand Hotel",
  code: "LSG-001",
  address: "123 Luxury Avenue, Downtown",
  city: "New York",
  state: "NY",
  zip: "10001",
  phone: "",
  email: "",
};

const defaultNotificationSettings: NotificationSettings = {
  new_booking_alerts: true,
  checkin_reminders: true,
  low_inventory_alerts: true,
  payment_notifications: false,
  daily_summary: true,
};

const defaultQuickMenuSettings: QuickMenuSettings = {
  enabled_items: ["1", "4", "5", "6", "12", "13"],
};

const defaultUIPreferences: UIPreferences = {
  ios_materials: true,
  glass_intensity: "medium",
  animations_enabled: true,
  disable_on_mobile: false,
  font_family_sans: "Inter",
  font_family_display: "Playfair Display",
  base_font_size: 16,
  base_radius: 12,
  base_spacing: 4,
  primary_color: "215 100% 50%", // HSL format
  accent_color: "222 47% 6%",
  blur_amount: 12,
  background_opacity: 0.6,
  saturation: 1.2,
  animation_preset: "spring",
  sidebar_dropdowns_enabled: true,
  navigation_style: "default",
  persistent_popups: true,
  standardize_page_dropdowns: true,
  is_staged: false,
};

const defaultUITemplates: UITemplatesSettings = {
  templates: [
    {
      id: "ios-classic",
      name: "iOS Classic",
      description: "Original iOS 17 inspired glassmorphism",
      preferences: defaultUIPreferences,
      is_system: true
    },
    {
      id: "minimalist",
      name: "Clean Minimalist",
      description: "Reduced blur and higher contrast",
      preferences: {
        ...defaultUIPreferences,
        blur_amount: 4,
        background_opacity: 0.9,
        base_radius: 8,
      },
      is_system: true
    }
  ]
};

const defaultAPIKeys: APIKeysSettings = {
  keys: [],
};

const defaultLocalizationSettings: LocalizationSettings = {
  calendar_mode: "AD",
  language: "en",
  number_standard: "international",
  currency: "NPR",
  time_format: "12h",
  first_day_of_week: 0,
  measurement_system: "metric",
  currency_display: "symbol",
  fiscal_year_start_month: 4, // Default to April (common for many accounting cycles including NP)
  digit_standard: "latin",
  date_format_bs: "short",
  date_format_ad: "dd/MM/yyyy",
  timezone: "Asia/Kathmandu",
};

// Generic settings fetch hook
export function useSettings<T>(key: string, defaultValue: T) {
  return useQuery({
    queryKey: queryKeys.settings.key(key),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      // Tolerate missing table gracefully (e.g. before migrations are applied).
      // The settings table is created by the initial migration.
      // If it doesn't exist yet, return the default value instead of throwing,
      // which would leave ProtectedRoute stuck in loading forever.
      if (error) {
        if (error.code === "PGRST205" || (error as any).code === "42P01") {
          console.warn(`settings table not found — returning default for "${key}". Apply the database migrations.`);
          return defaultValue;
        }
        throw error;
      }
      if (!data) return defaultValue;
      return data.value as unknown as T;
    },
    staleTime: 1000 * 60 * 10,
    retry: false, // Don't retry on missing-table errors
  });
}

// Generic settings update hook
export function useUpdateSettings<T>(key: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: T) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      const jsonValue: Json = settings as unknown as Json;

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: jsonValue })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert([{ key, value: jsonValue }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.key(key) });
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });
}

// Specific hooks for each settings category
export function useCheckInSettings() {
  return useSettings<CheckInFieldSettings>("check_in_fields", defaultCheckInSettings);
}

export function useUpdateCheckInSettings() {
  return useUpdateSettings<CheckInFieldSettings>("check_in_fields");
}

export function usePaymentSettings() {
  return useSettings<PaymentSettings>("payment_settings", defaultPaymentSettings);
}

export function useUpdatePaymentSettings() {
  return useUpdateSettings<PaymentSettings>("payment_settings");
}

export function useBookingSourcesSettings() {
  return useSettings<BookingSourcesSettings>("booking_sources", defaultBookingSources);
}

export function useUpdateBookingSourcesSettings() {
  return useUpdateSettings<BookingSourcesSettings>("booking_sources");
}

export function useRatePlansSettings() {
  return useSettings<RatePlansSettings>("rate_plans", defaultRatePlans);
}

export function useUpdateRatePlansSettings() {
  return useUpdateSettings<RatePlansSettings>("rate_plans");
}

export function usePropertySettings() {
  return useSettings<PropertySettings>("property_details", defaultPropertySettings);
}

export function useUpdatePropertySettings() {
  return useUpdateSettings<PropertySettings>("property_details");
}

export function useNotificationSettings() {
  return useSettings<NotificationSettings>("notification_settings", defaultNotificationSettings);
}

export function useUpdateNotificationSettings() {
  return useUpdateSettings<NotificationSettings>("notification_settings");
}

export function useQuickMenuSettings() {
  return useSettings<QuickMenuSettings>("quick_menu", defaultQuickMenuSettings);
}

export function useUpdateQuickMenuSettings() {
  return useUpdateSettings<QuickMenuSettings>("quick_menu");
}

export function useUIPreferences() {
  return useSettings<UIPreferences>("ui_preferences", defaultUIPreferences);
}

export function useUpdateUIPreferences() {
  return useUpdateSettings<UIPreferences>("ui_preferences");
}

export function useStagedUIPreferences() {
  return useSettings<UIPreferences>("ui_preferences_staged", defaultUIPreferences);
}

export function useUpdateStagedUIPreferences() {
  return useUpdateSettings<UIPreferences>("ui_preferences_staged");
}

export function useUITemplates() {
  return useSettings<UITemplatesSettings>("ui_templates", defaultUITemplates);
}

export function useUpdateUITemplates() {
  return useUpdateSettings<UITemplatesSettings>("ui_templates");
}

export function useAPIKeysSettings() {
  return useSettings<APIKeysSettings>("api_keys", defaultAPIKeys);
}

export function useUpdateAPIKeysSettings() {
  return useUpdateSettings<APIKeysSettings>("api_keys");
}

export function useLocalizationSettings() {
  return useSettings<LocalizationSettings>("localization_settings", defaultLocalizationSettings);
}

export function useUserRolesPermissions() {
  const allModules = [...navItems, ...operationsNavItems, ...adminNavItems];

  const defaultPermissions: UserRolesSettingsData = {
    global_enabled: true,
    modules: allModules.reduce((acc, item) => {
      acc[item.label] = {
        view: true,
        write: true,
        delete: true,
        report: true,
        enabled: true,
      };
      return acc;
    }, {} as Record<string, ModulePermission>),
  };

  return useSettings<UserRolesSettingsData>("user_roles_permissions", defaultPermissions);
}

export function useUpdateLocalizationSettings() {
  return useUpdateSettings<LocalizationSettings>("localization_settings");
}

export function useBusinessDate() {
  return useSettings<string>("business_date", new Date().toISOString().split("T")[0]);
}

export function useUpdateBusinessDate() {
  return useUpdateSettings<string>("business_date");
}
