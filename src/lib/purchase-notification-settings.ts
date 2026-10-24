import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PurchaseMessage = { text: string; enabled: boolean };
export type PurchaseNotificationSettings = {
  enabled: boolean; title: string; messages: PurchaseMessage[];
  display_seconds: number; interval_seconds: number;
};
export const defaultPurchaseSettings: PurchaseNotificationSettings = {
  enabled: true, title: "Destaque 3DFLEX",
  messages: [{ text: "Encontre a cor ideal para seu próximo projeto. Conheça nossos filamentos!", enabled: true }],
  display_seconds: 6, interval_seconds: 60,
};
export const PURCHASE_SETTINGS_KEY = ["purchase-notification-settings"];
export const purchaseSettingsTable = () => (supabase as unknown as SupabaseClient).from("purchase_notification_settings");

const purchaseClaim = /(?:compra|pedido)\s+(?:realizad[oa]|confirmad[oa])|pagamento\s+confirmado|acab(?:ou|aram)\s+de\s+comprar|(?:cliente|pessoa|alguém).{0,40}(?:comprou|compraram|comprando)/i;

// Older saved purchase notices must never become fabricated sale events.
export function promotionalSettings(value: PurchaseNotificationSettings): PurchaseNotificationSettings {
  return {
    ...value,
    title: purchaseClaim.test(value.title) ? defaultPurchaseSettings.title : value.title,
    messages: value.messages.map(message => ({ ...message, text: purchaseClaim.test(message.text) ? defaultPurchaseSettings.messages[0].text : message.text })),
  };
}

export function validatePurchaseSettings(value: PurchaseNotificationSettings): PurchaseNotificationSettings {
  if (!Number.isInteger(value.display_seconds) || value.display_seconds < 3 || value.display_seconds > 20)
    throw new Error("O tempo na tela deve ser de 3 a 20 segundos.");
  if (!Number.isInteger(value.interval_seconds) || value.interval_seconds < 15 || value.interval_seconds > 300 || value.interval_seconds < value.display_seconds + 5)
    throw new Error("O intervalo deve ser de 15 a 300 segundos e deixar ao menos 5 segundos entre os avisos.");
  const title = value.title.trim();
  if (!title || title.length > 80) throw new Error("O título deve ter de 1 a 80 caracteres.");
  if (!Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 6)
    throw new Error("Cadastre de 1 a 6 mensagens.");
  const messages = value.messages.map(message => {
    const text = message.text.trim();
    if (!text || text.length > 180 || typeof message.enabled !== "boolean") throw new Error("Cada mensagem deve ter de 1 a 180 caracteres.");
    return { text, enabled: message.enabled };
  });
  if (purchaseClaim.test(title) || messages.some(message => purchaseClaim.test(message.text)))
    throw new Error("Use mensagens promocionais, sem afirmar compras ou pagamentos de clientes.");
  if (value.enabled && !messages.some(message => message.enabled)) throw new Error("Ative pelo menos uma mensagem ou desligue os avisos.");
  return { enabled: value.enabled === true, title, messages, display_seconds: value.display_seconds, interval_seconds: value.interval_seconds };
}

export function usePurchaseNotificationSettings() {
  return useQuery<PurchaseNotificationSettings>({
    queryKey: PURCHASE_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await purchaseSettingsTable().select("enabled,title,messages,display_seconds,interval_seconds").eq("id", "main").maybeSingle();
      if (error) throw error;
      return validatePurchaseSettings(promotionalSettings(data ?? defaultPurchaseSettings));
    },
    staleTime: 30000, refetchInterval: 60000, retry: 1,
  });
}
