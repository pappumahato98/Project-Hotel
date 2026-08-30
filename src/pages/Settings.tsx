import React, { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Hotel, Bell, Shield, ClipboardCheck, CreditCard, Globe, Tags, ShieldAlert, Zap, Megaphone, Settings2, Download, Upload, LayoutDashboard } from "lucide-react";
import { 
  useCheckInSettings, useUpdateCheckInSettings, 
  usePaymentSettings, useUpdatePaymentSettings,
  useBookingSourcesSettings, useUpdateBookingSourcesSettings,
  useRatePlansSettings, useUpdateRatePlansSettings,
  usePropertySettings, useUpdatePropertySettings,
  useNotificationSettings, useUpdateNotificationSettings,
  useQuickMenuSettings, useUpdateQuickMenuSettings,
  useLocalizationSettings, useUpdateLocalizationSettings,
  CheckInFieldSettings, PaymentSettings, PropertySettings, NotificationSettings, QuickMenuSettings, LocalizationSettings,
} from "@/hooks/useSettings";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Navigate, useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckInSettingsCard, PaymentSettingsCard, NotificationSettingsCard,
  PropertySettingsCard, SecuritySettingsCard, BookingSourcesCard, RatePlansCard,
  QuickMenuSettingsCard, BroadcastSettings, PaymentGatewayConfigPanel, ConfigureModuleCard,
  LocalizationSettingsCard, UIStandardizationCard, UserRolesSettings,
} from "@/components/settings";

type SettingsTab = "checkin" | "ui" | "user_roles" | "localization" | "payment" | "sources" | "rates" | "property" | "notifications" | "security" | "quickmenu" | "broadcast" | "configure";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as SettingsTab) || "checkin";
  const { isAdmin, isLoading: isLoadingRole } = useIsAdmin();

  const handleTabChange = (value: SettingsTab) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: checkInSettings, isLoading: isLoadingCheckIn } = useCheckInSettings();
  const updateCheckIn = useUpdateCheckInSettings();
  const { data: paymentSettings, isLoading: isLoadingPayment } = usePaymentSettings();
  const updatePayment = useUpdatePaymentSettings();
  const { data: bookingSources, isLoading: isLoadingSources } = useBookingSourcesSettings();
  const updateSources = useUpdateBookingSourcesSettings();
  const { data: ratePlans, isLoading: isLoadingRates } = useRatePlansSettings();
  const updateRates = useUpdateRatePlansSettings();
  const { data: propertySettings, isLoading: isLoadingProperty } = usePropertySettings();
  const updateProperty = useUpdatePropertySettings();
  const { data: notificationSettings, isLoading: isLoadingNotifications } = useNotificationSettings();
  const updateNotifications = useUpdateNotificationSettings();
  const { data: quickMenuSettings, isLoading: isLoadingQuickMenu } = useQuickMenuSettings();
  const updateQuickMenu = useUpdateQuickMenuSettings();
  const { data: localizationSettings, isLoading: isLoadingLocalization } = useLocalizationSettings();
  const updateLocalization = useUpdateLocalizationSettings();

  if (isLoadingRole) {
    return (
      <MainLayout title="Settings" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  // In development, allow access. In production, only if isAdmin is confirmed.
  // Handle null state explicitly if useIsAdmin is still loading or user isn't authenticated yet.
  if (isAdmin === false && !import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: "checkin" as const, icon: ClipboardCheck, label: "Check-in Settings" },
    { id: "ui" as const, icon: LayoutDashboard, label: "UI Standardization" },
    { id: "user_roles" as const, icon: Shield, label: "User & Roles Management" },
    { id: "localization" as const, icon: Globe, label: "Localization" },
    { id: "payment" as const, icon: CreditCard, label: "Payment Settings" },
    { id: "sources" as const, icon: Globe, label: "Booking Sources" },
    { id: "rates" as const, icon: Tags, label: "Rate Plans" },
    { id: "quickmenu" as const, icon: Zap, label: "POS Quick Menu" },
    { id: "property" as const, icon: Hotel, label: "Property Details" },
    { id: "notifications" as const, icon: Bell, label: "Notifications" },
    { id: "broadcast" as const, icon: Megaphone, label: "Broadcasts" },
    { id: "configure" as const, icon: Settings2, label: "Configure" },
    { id: "security" as const, icon: Shield, label: "Security" },
  ];

  const handleQuickMenuToggle = (itemId: string, enabled: boolean) => {
    const currentItems = quickMenuSettings?.enabled_items || [];
    const newItems = enabled 
      ? [...currentItems, itemId]
      : currentItems.filter(id => id !== itemId);
    updateQuickMenu.mutate({ enabled_items: newItems });
  };

  const handleExportSettings = async () => {
    try {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Settings exported successfully");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    }
  };

  const handleImportSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      if (!Array.isArray(settings)) throw new Error("Invalid format");
      for (const s of settings) {
        if (s.key && s.value !== undefined) {
          await supabase.from("settings").upsert({ key: s.key, value: s.value }, { onConflict: "key" });
        }
      }
      toast.success("Settings imported successfully");
      window.location.reload();
    } catch (e: any) {
      toast.error("Import failed: " + e.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <MainLayout fixedHeight title="Admin Settings" subtitle="Manage system configuration (Admin only)">
      <ErrorBoundary>
        <div className="flex flex-col h-full overflow-hidden">
        <div className="mb-4 flex items-center justify-between flex-shrink-0 px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="h-4 w-4" />
            <span>You are viewing admin-only settings. Changes affect all users.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSettings}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportSettings} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden p-4 sm:p-6">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 scrollbar-hide">
            {tabs.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className="justify-start gap-3 whitespace-nowrap flex-shrink-0"
                onClick={() => handleTabChange(item.id)}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
            {activeTab === "checkin" && (
              <CheckInSettingsCard
                settings={checkInSettings}
                isLoading={isLoadingCheckIn}
                isPending={updateCheckIn.isPending}
                onSettingChange={(key, value) => checkInSettings && updateCheckIn.mutate({ ...checkInSettings, [key]: value })}
              />
            )}
            { activeTab === "ui" && (
              <UIStandardizationCard />
            )}
            {activeTab === "user_roles" && (
              <UserRolesSettings />
            )}
            {activeTab === "localization" && (
              <LocalizationSettingsCard
                settings={localizationSettings}
                isLoading={isLoadingLocalization}
                isPending={updateLocalization.isPending}
                onSettingChange={(key, value) => {
                  if (key === "full_settings") {
                    updateLocalization.mutate(value);
                    return;
                  }
                  const current = localizationSettings || {
                    calendar_mode: "AD",
                    language: "en",
                    number_standard: "international",
                    currency: "NPR",
                    time_format: "12h",
                    first_day_of_week: 0,
                    measurement_system: "metric",
                    currency_display: "symbol",
                    fiscal_year_start_month: 4,
                    digit_standard: "latin",
                    date_format_bs: "short",
                    date_format_ad: "dd/MM/yyyy",
                    timezone: "Asia/Kathmandu",
                  };
                  updateLocalization.mutate({ ...current, [key]: value });
                }}
              />
            )}
            {activeTab === "payment" && (
              <>
                <PaymentSettingsCard
                  settings={paymentSettings}
                  isLoading={isLoadingPayment}
                  isPending={updatePayment.isPending}
                  onSettingChange={(key, value) => paymentSettings && updatePayment.mutate({ ...paymentSettings, [key]: value })}
                />
                <PaymentGatewayConfigPanel />
              </>
            )}
            {activeTab === "sources" && (
              <BookingSourcesCard
                settings={bookingSources}
                isLoading={isLoadingSources}
                isPending={updateSources.isPending}
                onToggle={(id, enabled) => bookingSources && updateSources.mutate({ sources: bookingSources.sources.map(s => s.id === id ? { ...s, enabled } : s) })}
                onCommissionChange={(id, commission) => bookingSources && updateSources.mutate({ sources: bookingSources.sources.map(s => s.id === id ? { ...s, commission_percentage: commission } : s) })}
              />
            )}
            {activeTab === "rates" && (
              <RatePlansCard
                settings={ratePlans}
                isLoading={isLoadingRates}
                isPending={updateRates.isPending}
                onToggle={(id, enabled) => ratePlans && updateRates.mutate({ plans: ratePlans.plans.map(p => p.id === id ? { ...p, enabled } : p) })}
                onDiscountChange={(id, discount) => ratePlans && updateRates.mutate({ plans: ratePlans.plans.map(p => p.id === id ? { ...p, discount_percentage: discount } : p) })}
              />
            )}
            {activeTab === "quickmenu" && (
              <QuickMenuSettingsCard
                settings={quickMenuSettings}
                isLoading={isLoadingQuickMenu}
                isPending={updateQuickMenu.isPending}
                onToggleItem={handleQuickMenuToggle}
              />
            )}
            {activeTab === "property" && (
              <PropertySettingsCard
                settings={propertySettings}
                isLoading={isLoadingProperty}
                isPending={updateProperty.isPending}
                onSettingChange={(key, value) => propertySettings && updateProperty.mutate({ ...propertySettings, [key]: value })}
              />
            )}
            {activeTab === "notifications" && (
              <NotificationSettingsCard
                settings={notificationSettings}
                isLoading={isLoadingNotifications}
                isPending={updateNotifications.isPending}
                onSettingChange={(key, value) => notificationSettings && updateNotifications.mutate({ ...notificationSettings, [key]: value })}
              />
            )}
            {activeTab === "broadcast" && <BroadcastSettings />}
            {activeTab === "configure" && <ConfigureModuleCard />}
            {activeTab === "security" && <SecuritySettingsCard />}
          </div>
        </div>
        </div>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default Settings;
