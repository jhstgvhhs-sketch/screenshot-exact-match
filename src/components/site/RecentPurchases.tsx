import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseNotificationSettings } from "@/lib/purchase-notification-settings";

const SEEN = "3dflex-purchases-seen";
const DISMISSED = "3dflex-purchases-dismissed";
const fresh = (time: string) => {
  const age = Date.now() - Date.parse(time);
  return Number.isFinite(age) && age >= 0 && age < 86400000;
};

export function RecentPurchases() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  const allowed = pathname === "/" || pathname === "/produtos" || pathname.startsWith("/produto/");
  const settings = usePurchaseNotificationSettings();
  const config = settings.data;
  const messages = config?.messages.filter(message => message.enabled) ?? [];
  const [purchase, setPurchase] = useState<{ createdAt: string; messageIndex: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPurchase(null);
    if (!allowed || dismissed || settings.isError || !config?.enabled || !messages.length) return;
    const displayDelay = config.display_seconds * 1000;
    const intervalDelay = config.interval_seconds * 1000;
    let messageIndex = 0;
    const seen = new Set<string>();
    try {
      if (sessionStorage.getItem(DISMISSED)) return;
      const saved = JSON.parse(sessionStorage.getItem(SEEN) ?? "[]");
      if (Array.isArray(saved)) saved.filter(value => typeof value === "string" && fresh(value)).forEach(value => seen.add(value));
    } catch { /* Storage is optional. */ }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let hide: ReturnType<typeof setTimeout>;
    async function showNext() {
      if (document.visibilityState !== "hidden") {
        try {
          const { data, error } = await supabase.functions.invoke("recent-purchases", { method: "GET" });
          if (!active) return;
          const next = !error && Array.isArray(data?.purchases) ? data.purchases.find((value: { createdAt?: unknown }) =>
            typeof value?.createdAt === "string" && fresh(value.createdAt) && !seen.has(value.createdAt)) : null;
          if (next) {
            seen.add(next.createdAt);
            try { sessionStorage.setItem(SEEN, JSON.stringify([...seen].slice(-50))); } catch { /* Optional. */ }
            setPurchase({ createdAt: next.createdAt, messageIndex: messageIndex++ });
            hide = setTimeout(() => { if (active) setPurchase(null); }, displayDelay);
          }
        } catch { /* No real purchase or unavailable feed: show nothing. */ }
      }
      if (active) timer = setTimeout(showNext, intervalDelay);
    }
    timer = setTimeout(showNext, 8000);
    return () => { active = false; clearTimeout(timer); clearTimeout(hide); };
  }, [allowed, dismissed, config, settings.isError]);

  if (!allowed || dismissed || settings.isError || !config?.enabled || !messages.length || !purchase || !fresh(purchase.createdAt)) return null;
  const minutes = Math.floor((Date.now() - Date.parse(purchase.createdAt)) / 60000);
  const time = minutes < 1 ? "agora há pouco" : minutes < 60 ? `há ${minutes} min` : `há ${Math.floor(minutes / 60)} h`;
  return <aside role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-4 left-4 z-40 flex w-[calc(100%-2rem)] max-w-sm gap-3 rounded-xl border border-primary/30 bg-card p-4 text-card-foreground shadow-xl motion-safe:animate-in motion-safe:slide-in-from-bottom-2">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><ShoppingBag className="h-5 w-5" aria-hidden="true"/></span>
    <div className="min-w-0 flex-1"><p className="text-sm font-bold">{config.title}</p><p className="mt-1 text-sm">{messages[purchase.messageIndex % messages.length]?.text}</p><p className="mt-1 text-xs text-muted-foreground">Pagamento confirmado {time}</p></div>
    <button type="button" aria-label="Fechar notificações de compras" className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted" onClick={() => { setDismissed(true); setPurchase(null); try { sessionStorage.setItem(DISMISSED, "true"); } catch { /* Optional. */ } }}><X className="h-4 w-4" aria-hidden="true"/></button>
  </aside>;
}
