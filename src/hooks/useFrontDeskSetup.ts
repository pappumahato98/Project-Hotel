import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFrontDeskSetup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: propertyInfo, isLoading: isLoadingPropertyInfo } = useQuery({
    queryKey: ["settings", "property_info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "property_info")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      const defaultInfo = {
        name: "LuxeStay Resort & Spa",
        address: "123 Horizon Beach Road",
        city: "Dhalkewar",
        country: "Nepal",
        phone: "+977-61-540123",
        email: "reservations@luxestay.com",
        website: "https://luxestay-resort.com",
        currency: "NPR",
        timezone: "Asia/Kathmandu",
        taxNumber: "VAT-304918293",
        floors: 3,
        alternateCurrencies: [
          { code: "USD", name: "US Dollar", exchangeRate: 133.5, enabled: true },
          { code: "EUR", name: "Euro", exchangeRate: 145.2, enabled: true },
          { code: "INR", name: "Indian Rupee", exchangeRate: 1.6, enabled: true },
          { code: "GBP", name: "British Pound", exchangeRate: 168.9, enabled: false }
        ],
        exchangeRateRule: "daily_manual",
        seasons: [
          { id: "s1", name: "Peak Season", startMonth: "Oct", endMonth: "Mar", rateModifier: 25, type: "peak" },
          { id: "s2", name: "Off-Peak", startMonth: "Apr", endMonth: "Jun", rateModifier: -15, type: "off-peak" },
          { id: "s3", name: "Festival Period", startMonth: "Sep", endMonth: "Oct", rateModifier: 35, type: "festival" },
          { id: "s4", name: "Monsoon Low Season", startMonth: "Jul", endMonth: "Aug", rateModifier: -25, type: "low-season" }
        ],
        emergencyContacts: [
          { id: "ec1", role: "Security Head", name: "Bikram Rana", phone: "+977-9801234567", available: "24/7" },
          { id: "ec2", role: "Fire Marshal", name: "Sita Sharma", phone: "+977-9807654321", available: "24/7" },
          { id: "ec3", role: "Maintenance Lead", name: "Ram Bahadur", phone: "+977-9812345678", available: "6AM-10PM" },
          { id: "ec4", role: "Manager On-Call", name: "Priya Thapa", phone: "+977-9856781234", available: "After Hours" }
        ],
        idTypes: [
          { id: "id1", name: "Passport", code: "PASS", required: true, foreignOnly: false },
          { id: "id2", name: "National ID (Citizenship)", code: "NID", required: true, foreignOnly: false },
          { id: "id3", name: "Driving License", code: "DL", required: false, foreignOnly: false },
          { id: "id4", name: "PAN Card", code: "PAN", required: false, foreignOnly: false },
          { id: "id5", name: "Aadhaar Card", code: "AADH", required: false, foreignOnly: false },
          { id: "id6", name: "Voter ID", code: "VOTER", required: false, foreignOnly: false }
        ]
      };

      return (data?.value as any) || defaultInfo;
    }
  });

  const updatePropertyInfo = useMutation({
    mutationFn: async (info: any) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "property_info")
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from("settings")
          .update({ value: info, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("settings")
          .insert([{ key: "property_info", value: info }]);
        error = insertError;
      }

      if (error) throw error;
      return info;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "property_info"] });
      toast({ title: "Success", description: "Property Info saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { data: roomTypes, isLoading: isLoadingRoomTypes } = useQuery({
    queryKey: ["settings", "room_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "room_types")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      const defaultTypes = [
        { id: "rt1", name: "Standard Queen", code: "STDQ", occupancy: 2, maxOccupancy: 2, basePrice: 85, status: "Active", segment: "Standard", notes: "", blockingRule: "none" },
        { id: "rt2", name: "Deluxe King Room", code: "DLXK", occupancy: 2, maxOccupancy: 3, basePrice: 135, status: "Active", segment: "Premium", notes: "No smoking", blockingRule: "none" },
        { id: "rt3", name: "Family Executive Suite", code: "FSUITE", occupancy: 4, maxOccupancy: 6, basePrice: 240, status: "Active", segment: "Executive", notes: "Pet-friendly", blockingRule: "none" },
        { id: "rt4", name: "Royal Penthouse Suite", code: "RPHS", occupancy: 4, maxOccupancy: 8, basePrice: 590, status: "Inactive", segment: "Executive", notes: "VIP only", blockingRule: "vip_only" },
      ];

      return (data?.value as any[]) || defaultTypes;
    }
  });

  const updateRoomTypes = useMutation({
    mutationFn: async (types: any[]) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "room_types")
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from("settings")
          .update({ value: types, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("settings")
          .insert([{ key: "room_types", value: types }]);
        error = insertError;
      }

      if (error) throw error;
      return types;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "room_types"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { data: dbRatePlans, isLoading: isLoadingRatePlans } = useQuery({
    queryKey: ["rate_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_plans")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const updateRatePlan = useMutation({
    mutationFn: async (plan: any) => {
      if (plan.id && !plan.id.startsWith("rp_")) {
        const { data, error } = await supabase
          .from("rate_plans")
          .update({
            name: plan.name,
            code: plan.code,
            discount_percentage: plan.discountValue,
            is_active: plan.status === "Active"
          })
          .eq("id", plan.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("rate_plans")
          .insert([{
            name: plan.name,
            code: plan.code,
            discount_percentage: plan.discountValue,
            is_active: plan.status === "Active"
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_plans"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteRatePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_plans"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { data: dbTaxRates, isLoading: isLoadingTaxRates } = useQuery({
    queryKey: ["tax_rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const updateTaxRate = useMutation({
    mutationFn: async (tax: any) => {
      if (tax.id && !tax.id.startsWith("tg_")) {
        const { data, error } = await supabase
          .from("tax_rates")
          .update({
            name: tax.name,
            rate: tax.rate,
            is_active: tax.active,
            code: tax.name.toUpperCase().substring(0, 5)
          })
          .eq("id", tax.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("tax_rates")
          .insert([{
            name: tax.name,
            rate: tax.rate,
            is_active: tax.active,
            code: tax.name.toUpperCase().substring(0, 5)
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_rates"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteTaxRate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tax_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_rates"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // --- Generic Settings Manager ---
  const useSetting = (key: string, defaultValue: any) => {
    return useQuery({
      queryKey: ["settings", key],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("settings")
          .select("value")
          .eq("key", key)
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        return (data?.value as any) || defaultValue;
      }
    });
  };

  const useUpdateSetting = (key: string) => {
    return useMutation({
      mutationFn: async (value: any) => {
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .eq("key", key)
          .maybeSingle();

        let error;
        if (existing) {
          const { error: updateError } = await supabase
            .from("settings")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from("settings")
            .insert([{ key, value }]);
          error = insertError;
        }

        if (error) throw error;
        return value;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["settings", key] });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  // Remaining Setting Hooks
  const { data: dbPolicies, isLoading: isLoadingPolicies } = useSetting("policies", {
    checkInGraceMinutes: 30,
    earlyCheckInHourLimit: 6,
    earlyCheckInFee: 15,
    lateCheckOutHourLimit: 2,
    lateCheckOutFee: 20,
    depositRequired: true,
    depositPercentage: 50,
    cancellationWindowHours: 48,
    noShowPenaltyCharge: "1st Night Room Charge",
    autoPostRoomChargesTime: "02:00",
    defaultTaxGroup: "tg1",
    expressCheckIn: true,
    expressCheckOut: true,
    expressEligibility: "pre_approved",
    earlyCheckInSteppedPricing: [
      { hours: 1, fee: 0, label: "First hour free" },
      { hours: 2, fee: 15, label: "2nd hour" },
      { hours: 3, fee: 25, label: "3rd hour+" }
    ],
    lateCheckOutSteppedPricing: [
      { hours: 1, fee: 0, label: "First hour free" },
      { hours: 2, fee: 20, label: "2nd hour" },
      { hours: 3, fee: 35, label: "3rd hour+" }
    ],
    upsellEnabled: true,
    upsellMinAvailableRooms: 4,
    upsellSegment: "Premium",
    corporatePolicyEnabled: true,
    corporateNoDeposit: true,
    corporateCreditLimitDefault: 50000,
    creditLimitRules: [
      { id: "cl1", guestType: "Corporate", limit: 50000, alertAt: 80 },
      { id: "cl2", guestType: "Government", limit: 100000, alertAt: 90 },
      { id: "cl3", guestType: "Walk-in", limit: 10000, alertAt: 70 }
    ]
  });
  const updatePolicies = useUpdateSetting("policies");

  const { data: dbPaymentMethods, isLoading: isLoadingPaymentMethods } = useSetting("payment_methods", [
    { id: "pm1", name: "Cash Payment", code: "CASH", enabled: true, captureMode: "immediate" },
    { id: "pm2", name: "Credit/Debit Card Terminal", code: "CARD", enabled: true, captureMode: "pre_auth" },
    { id: "pm3", name: "Bank Swift Wire Transfer", code: "WIRE", enabled: false, captureMode: "batch" },
    { id: "pm4", name: "eSewa Direct Wallet Sync", code: "ESEWA", enabled: true, captureMode: "immediate" },
    { id: "pm5", name: "Khalti Wallet", code: "KHALTI", enabled: true, captureMode: "immediate" },
    { id: "pm6", name: "UPI / QR Code", code: "UPI", enabled: false, captureMode: "immediate" },
    { id: "pm7", name: "Crypto (BTC/ETH)", code: "CRYPTO", enabled: false, captureMode: "immediate" },
    { id: "pm8", name: "BNPL (Buy Now Pay Later)", code: "BNPL", enabled: false, captureMode: "deferred" },
    { id: "pm9", name: "Promotional Voucher", code: "VOUCHER", enabled: true, captureMode: "immediate" },
  ]);
  const updatePaymentMethods = useUpdateSetting("payment_methods");

  const { data: dbGatewayConfig, isLoading: isLoadingGatewayConfig } = useSetting("gateway_config", {
    provider: "stripe",
    apiKey: "pk_test_51O83hNIsW...",
    secretKey: "sk_test_51O83hNIsW...",
    sandboxMode: true,
    webhookUrl: "https://api.luxestay.com/v1/payments/stripe/webhook",
    captureMode: "pre_auth",
    fallbackEnabled: true,
    fallbackProvider: "razorpay",
    fallbackApiKey: "rzp_test_abc123...",
    settlementFormat: "csv",
    settlementSchedule: "daily",
    tokenRetentionDays: 30,
    cardOnFileEnabled: true,
    fraudFlags: {
      enabled: true,
      highRiskThreshold: 5000,
      autoBlockCountries: ["XX"],
      manualReviewAbove: 25000
    },
    refundRules: {
      minRefund: 100,
      maxRefundPerDay: 100000,
      managerApprovalAbove: 10000
    }
  });
  const updateGatewayConfig = useUpdateSetting("gateway_config");

  const { data: dbPosOutlets, isLoading: isLoadingPosOutlets } = useSetting("pos_outlets", [
    { id: "pos_t", name: "Main Terrace Restaurant", apiEndpoint: "192.168.1.55/api/pos/terrace", status: "Connected", autoFolioCharge: true, operatingHours: "06:00-23:00", closingTime: "23:00", autoPostCutoff: true, staffDiscount: 10, maxDiscountItems: 2 },
    { id: "pos_b", name: "Sky Pool Bar", apiEndpoint: "192.168.1.56/api/pos/poolbar", status: "Connected", autoFolioCharge: true, operatingHours: "10:00-22:00", closingTime: "22:00", autoPostCutoff: true, staffDiscount: 10, maxDiscountItems: 2 },
    { id: "pos_s", name: "Luxe Spa Reception", apiEndpoint: "192.168.1.57/api/pos/spa", status: "Disconnected", autoFolioCharge: false, operatingHours: "08:00-20:00", closingTime: "20:00", autoPostCutoff: false, staffDiscount: 0, maxDiscountItems: 0 }
  ]);
  const updatePosOutlets = useUpdateSetting("pos_outlets");

  const { data: dbPhoneConfig, isLoading: isLoadingPhoneConfig } = useSetting("phone_config", {
    systemType: "Asterisk VoIP PBX",
    host: "192.168.1.40",
    port: "5060",
    extensionLength: 3,
    autoChargeFolio: true,
    pricePerMinute: 0.15,
    maxCallsPerDay: 500,
    autoBlockAfterLimit: true,
    rateCards: [
      { id: "rc1", guestType: "Corporate", rateMultiplier: 0.5, label: "50% rate" },
      { id: "rc2", guestType: "VIP", rateMultiplier: 0, label: "Free calls" },
      { id: "rc3", guestType: "Walk-in", rateMultiplier: 1.0, label: "Full rate" }
    ],
    disableInOOORooms: true
  });
  const updatePhoneConfig = useUpdateSetting("phone_config");

  const { data: dbDocTemplates, isLoading: isLoadingDocTemplates } = useSetting("doc_templates", {
    reg_card: `<!DOCTYPE html>...`,
    invoice: `<!DOCTYPE html>...`,
    confirm: `<!DOCTYPE html>...`
  });
  const updateDocTemplates = useUpdateSetting("doc_templates");

  const { data: dbLegalTexts, isLoading: isLoadingLegalTexts } = useSetting("legal_texts", {
    terms: "Hotel Terms: All check-ins require credit card authorization. Noise policies enforced from 10 PM to 7 AM.",
    privacy: "Privacy Policy: Guest registration records are retained in compliance with local hospitality regulations and will not be shared with external vendors.",
    waiver: "Liability Waiver: LuxeStay is not liable for items left outside rooms, or incidents inside the swimming area without lifeguards.",
    versions: [
      { id: "v1", date: "2026-01-15", label: "Initial Terms v1.0", active: true },
    ],
    territories: [
      { id: "t1", region: "Nepal", customDisclaimer: "Subject to Nepal Tourism Board regulations." }
    ],
    consentTracking: true
  });
  const updateLegalTexts = useUpdateSetting("legal_texts");

  // New: Loyalty & Membership Setup
  const { data: dbLoyaltySetup, isLoading: isLoadingLoyalty } = useSetting("loyalty_setup", {
    enabled: true,
    programName: "LuxeStay Rewards",
    tiers: [
      { id: "lt1", name: "Silver", minNights: 0, pointsMultiplier: 1.0, color: "#94a3b8", benefits: ["Welcome drink", "Late check-out request"] },
      { id: "lt2", name: "Gold", minNights: 10, pointsMultiplier: 1.5, color: "#f59e0b", benefits: ["Free breakfast", "Room upgrade (subject to availability)", "Late check-out guaranteed"] },
      { id: "lt3", name: "Platinum", minNights: 25, pointsMultiplier: 2.0, color: "#a78bfa", benefits: ["Suite upgrade", "Free spa access", "Airport transfer", "Dedicated concierge"] }
    ],
    pointsPerNight: 100,
    pointsExpiry: 365,
    redemptionRate: 0.5,
    autoUpgrade: true,
    promoBonus: { enabled: true, multiplier: 2, label: "Double Points Weekend" }
  });
  const updateLoyaltySetup = useUpdateSetting("loyalty_setup");

  // New: Revenue Management Parameters
  const { data: dbRevenueConfig, isLoading: isLoadingRevenue } = useSetting("revenue_config", {
    occupancyPricingEnabled: true,
    occupancyThresholds: [
      { id: "ot1", minOccupancy: 85, rateIncrease: 10, label: "High demand" },
      { id: "ot2", minOccupancy: 95, rateIncrease: 25, label: "Near capacity" }
    ],
    bookingPaceRules: [
      { id: "bp1", daysBeforeArrival: 14, minPickupPercent: 30, action: "Release 5 rooms for walk-in" },
      { id: "bp2", daysBeforeArrival: 7, minPickupPercent: 50, action: "Increase BAR by 5%" }
    ],
    compRules: {
      enabled: true,
      noCompsBelowADR: 3000,
      maxCompPercentPerMonth: 2,
      approvalRequired: true
    },
    adrTargets: {
      monthly: 4500,
      quarterly: 4200,
      alertBelowPercent: 90
    }
  });
  const updateRevenueConfig = useUpdateSetting("revenue_config");

  // New: Multi-Property / Centralized Setup
  const { data: dbMultiProperty, isLoading: isLoadingMultiProperty } = useSetting("multi_property", {
    enabled: false,
    brandName: "LuxeStay Hotels Group",
    properties: [
      { id: "mp1", name: "LuxeStay Pokhara", code: "LSP", city: "Pokhara", active: true, isPrimary: true },
      { id: "mp2", name: "LuxeStay Kathmandu", code: "LSK", city: "Kathmandu", active: true, isPrimary: false },
      { id: "mp3", name: "LuxeStay Chitwan", code: "LSC", city: "Chitwan", active: false, isPrimary: false }
    ],
    sharedSettings: {
      loyaltyProgram: true,
      taxTemplates: false,
      documentTemplates: true,
      ratePlans: false
    },
    interPropertyTransfer: {
      enabled: true,
      sameBrandOnly: true,
      requireApproval: true
    }
  });
  const updateMultiProperty = useUpdateSetting("multi_property");

  // New: Room Inventory Advanced Config
  const { data: dbRoomAdvancedConfig } = useSetting("room_advanced_config", {
    rotationRules: [
      { id: "rr1", label: "Prefer low floors for families", guestType: "Family", preference: "low_floor", priority: 1 },
      { id: "rr2", label: "Preferred rooms for seniors", guestType: "Senior", preference: "low_floor", priority: 2 },
      { id: "rr3", label: "Adjacent rooms for groups", guestType: "Group", preference: "adjacent", priority: 3 }
    ],
    statusColors: {
      available: "#22c55e",
      occupied: "#3b82f6",
      cleaning: "#f59e0b",
      maintenance: "#ef4444",
      blocked: "#6b7280",
      ooo: "#9333ea"
    },
    blockingReasons: ["Renovation", "Deep Cleaning", "VIP Hold", "Event", "Pest Control", "Plumbing"]
  });
  const updateRoomAdvancedConfig = useUpdateSetting("room_advanced_config");

  // New: OTA / Channel Manager Config
  const { data: dbOtaConfig } = useSetting("ota_config", {
    channels: [
      { id: "ota_b", name: "Booking.com", commission: 15, minRate: 2000, enabled: true, syncInterval: 15 },
      { id: "ota_e", name: "Expedia", commission: 18, minRate: 2000, enabled: true, syncInterval: 15 },
      { id: "ota_a", name: "Agoda", commission: 12, minRate: 1800, enabled: true, syncInterval: 30 },
      { id: "ota_air", name: "Airbnb", commission: 3, minRate: 2500, enabled: false, syncInterval: 60 }
    ],
    rateBuffer: 500,
    inventoryBlackout: 5,
    blackoutSyncMode: "manual",
    globalMinRate: 1500
  });
  const updateOtaConfig = useUpdateSetting("ota_config");


  return {
    propertyInfo, isLoadingPropertyInfo, updatePropertyInfo,
    roomTypes, isLoadingRoomTypes, updateRoomTypes,
    dbRatePlans, isLoadingRatePlans, updateRatePlan, deleteRatePlan,
    dbTaxRates, isLoadingTaxRates, updateTaxRate, deleteTaxRate,

    dbPolicies, updatePolicies,
    dbPaymentMethods, updatePaymentMethods,
    dbGatewayConfig, updateGatewayConfig,
    dbPosOutlets, updatePosOutlets,
    dbPhoneConfig, updatePhoneConfig,
    dbDocTemplates, updateDocTemplates,
    dbLegalTexts, updateLegalTexts,

    // New hooks
    dbLoyaltySetup, updateLoyaltySetup,
    dbRevenueConfig, updateRevenueConfig,
    dbMultiProperty, updateMultiProperty,
    dbRoomAdvancedConfig, updateRoomAdvancedConfig,
    dbOtaConfig, updateOtaConfig
  };
};
