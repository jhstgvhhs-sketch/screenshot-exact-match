import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings,
} from "@/lib/shipping";

const shippingSettingsTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from("shipping_settings");

export function useShippingSettings() {
  return useQuery<ShippingSettings>({
    queryKey: ["shipping-settings"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await shippingSettingsTable()
        .select("id,fixed_shipping_brl,free_pix_shipping_enabled,free_pix_shipping_threshold_brl")
        .eq("id", "main")
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SHIPPING_SETTINGS;
      const fixedShipping = Number(data.fixed_shipping_brl);
      const freePixThreshold = Number(data.free_pix_shipping_threshold_brl);
      return {
        fixed_shipping_brl: Number.isFinite(fixedShipping)
          ? Math.min(5000, Math.max(0, fixedShipping))
          : DEFAULT_SHIPPING_SETTINGS.fixed_shipping_brl,
        free_pix_shipping_enabled:
          typeof data.free_pix_shipping_enabled === "boolean"
            ? data.free_pix_shipping_enabled
            : DEFAULT_SHIPPING_SETTINGS.free_pix_shipping_enabled,
        free_pix_shipping_threshold_brl: Number.isFinite(freePixThreshold)
          ? Math.min(1_000_000, Math.max(0, freePixThreshold))
          : DEFAULT_SHIPPING_SETTINGS.free_pix_shipping_threshold_brl,
      };
    },
  });
}
