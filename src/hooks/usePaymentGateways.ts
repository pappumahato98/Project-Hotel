// Payment Gateway Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { loadStripe } from "@stripe/stripe-js";

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  is_configured: boolean;
  logo_url?: string;
  description: string;
  api_key?: string;
  secret_key?: string;
  merchant_id?: string;
  sandbox_mode: boolean;
  webhook_url?: string;
  type: 'national' | 'international';
}

export interface PaymentGatewaysSettings {
  gateways: PaymentGatewayConfig[];
}

// Default Payment Gateways
const defaultPaymentGateways: PaymentGatewaysSettings = {
  gateways: [
    {
      id: "esewa",
      name: "eSewa",
      code: "ESEWA",
      enabled: false,
      is_configured: false,
      description: "Nepal's leading digital wallet and payment platform",
      sandbox_mode: true,
      type: 'national',
    },
    {
      id: "khalti",
      name: "Khalti",
      code: "KHALTI",
      enabled: false,
      is_configured: false,
      description: "Digital wallet for online payments in Nepal",
      sandbox_mode: true,
      type: 'national',
    },
    {
      id: "connectips",
      name: "Connect IPS",
      code: "CONNECTIPS",
      enabled: false,
      is_configured: false,
      description: "Nepal Clearing House interbank payment system",
      sandbox_mode: true,
      type: 'national',
    },
    {
      id: "fonepay",
      name: "Fonepay",
      code: "FONEPAY",
      enabled: false,
      is_configured: false,
      description: "Digital payment network for Nepal banks",
      sandbox_mode: true,
      type: 'national',
    },
    {
      id: "stripe",
      name: "Stripe",
      code: "STRIPE",
      enabled: false,
      is_configured: false,
      description: "International credit/debit card processing",
      sandbox_mode: true,
      type: 'international',
    },
    {
      id: "razorpay",
      name: "Razorpay",
      code: "RAZORPAY",
      enabled: false,
      is_configured: false,
      description: "Leading payment gateway for India and international",
      sandbox_mode: true,
      type: 'international',
    },
  ],
};

export function usePaymentGateways() {
  return useQuery({
    queryKey: ["settings", "payment_gateways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "payment_gateways")
        .maybeSingle();

      if (error) throw error;
      
      // Merge stored with defaults to ensure all required gateways exist
      const storedValue = data?.value as unknown as PaymentGatewaysSettings;
      const storedGateways = storedValue?.gateways || [];

      const mergedGateways = defaultPaymentGateways.gateways.map(defaultGw => {
        const stored = storedGateways.find(g => g.id === defaultGw.id);
        // If stored exists, use its configured values but keep the default type and description
        return stored ? { ...defaultGw, ...stored, type: defaultGw.type } : defaultGw;
      });
      
      return { gateways: mergedGateways };
    },
  });
}

export function useUpdatePaymentGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gateway: PaymentGatewayConfig) => {
      // Fetch current gateways from DB
      const { data: existing } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "payment_gateways")
        .maybeSingle();

      let currentGateways: PaymentGatewayConfig[] = [];
      if (existing?.value) {
        const stored = existing.value as unknown as PaymentGatewaysSettings;
        currentGateways = stored.gateways || [];
      }

      // Update or add the gateway
      const gatewayIndex = currentGateways.findIndex(g => g.id === gateway.id);
      let updatedGateways: PaymentGatewayConfig[];

      if (gatewayIndex > -1) {
        updatedGateways = [...currentGateways];
        updatedGateways[gatewayIndex] = gateway;
      } else {
        updatedGateways = [...currentGateways, gateway];
      }

      // Ensure we don't save removed gateways (cleanup)
      const validIds = defaultPaymentGateways.gateways.map(g => g.id);
      const cleanedGateways = updatedGateways.filter(g => validIds.includes(g.id));

      const jsonValue: Json = { gateways: cleanedGateways } as unknown as Json;

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: jsonValue })
          .eq("key", "payment_gateways");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert([{ key: "payment_gateways", value: jsonValue }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "payment_gateways"] });
      toast.success("Payment gateway updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update gateway: " + error.message);
    },
  });
}

export function useTogglePaymentGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gatewayId, enabled }: { gatewayId: string; enabled: boolean }) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "payment_gateways")
        .maybeSingle();

      if (!existing) return;

      const stored = existing.value as unknown as PaymentGatewaysSettings;
      const updatedGateways = (stored.gateways || []).map(g =>
        g.id === gatewayId ? { ...g, enabled } : g
      );

      const jsonValue: Json = { gateways: updatedGateways } as unknown as Json;

      const { error } = await supabase
        .from("settings")
        .update({ value: jsonValue })
        .eq("key", "payment_gateways");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "payment_gateways"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to toggle gateway: " + error.message);
    },
  });
}

// Process payment through a gateway
export async function processPayment(
  gatewayId: string,
  amount: number,
  currency: string = "USD",
  orderRef: string,
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  }
): Promise<{
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  error?: string;
}> {
  console.log(`Processing payment via ${gatewayId}:`, { amount, currency, orderRef, customerInfo });
  
  // Fetch gateway config from DB
  const { data: settings } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "payment_gateways")
    .maybeSingle();

  const gatewaysValue = settings?.value as unknown as PaymentGatewaysSettings;
  const config = gatewaysValue?.gateways?.find(g => g.id === gatewayId);

  if (!config || !config.enabled || !config.is_configured) {
    return { success: false, error: `${gatewayId} is not configured or enabled.` };
  }

  if (gatewayId === "stripe") {
    try {
      if (!config.api_key) throw new Error("Stripe Publishable Key is missing");

      const stripe = await loadStripe(config.api_key);
      if (!stripe) throw new Error("Failed to load Stripe");

      toast.info("Simulating Stripe Checkout redirect...");

      // NOTE: In a production environment with a backend:
      // 1. Call your backend to create a Checkout Session (using Secret Key)
      // 2. Return the sessionId to the frontend
      // 3. stripe.redirectToCheckout({ sessionId: session.id })

      // For this frontend-only integration, we simulate the redirect delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        transactionId: `STRIPE-${Date.now()}`,
        redirectUrl: `#stripe-success`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe payment failed";
      return { success: false, error: message };
    }
  }

  if (gatewayId === "razorpay") {
    try {
      if (!config.merchant_id) throw new Error("Razorpay Key ID is missing");

      // Load Razorpay Script
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      return new Promise((resolve) => {
        // Razorpay options
        const options: Record<string, unknown> = {
          key: config.merchant_id,
          amount: Math.round(amount * 100), // in paise
          currency: currency === "USD" ? "INR" : currency, // Razorpay works best with INR or specific currencies
          name: "LuxeStay ERP",
          description: `Payment for Order ${orderRef}`,
          handler: function (response: { razorpay_payment_id: string }) {
            toast.success("Razorpay payment successful!");
            resolve({
              success: true,
              transactionId: response.razorpay_payment_id || `RZP-${Date.now()}`,
            });
          },
          modal: {
            ondismiss: function() {
              resolve({ success: false, error: "Payment cancelled by user" });
            }
          },
          prefill: {
            name: customerInfo?.name,
            email: customerInfo?.email,
            contact: customerInfo?.phone,
          },
          theme: {
            color: "#0066ff", // Digital Blue
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Razorpay payment failed";
      return { success: false, error: message };
    }
  }

  // Fallback/National gateways simulation
  return {
    success: true,
    transactionId: `TXN-${gatewayId.toUpperCase()}-${Date.now()}`,
    redirectUrl: `#payment-success-${gatewayId}`,
  };
}

// Verify payment status (placeholder)
export async function verifyPayment(
  gatewayId: string,
  transactionId: string
): Promise<{
  success: boolean;
  status: "pending" | "completed" | "failed" | "refunded";
  error?: string;
}> {
  console.log(`Verifying payment ${transactionId} via ${gatewayId}`);
  
  return {
    success: true,
    status: "completed",
  };
}
