import { pixDisplayState } from "@/lib/payment-status";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, CircleAlert } from "lucide-react";
import { markRecoveryCompleted } from "@/lib/cart-recovery";
import { supabase } from "@/integrations/supabase/client";

type Status = "pending" | "paid" | "closed" | "unavailable";

export function PixPaymentStatus({ orderId, children }: { orderId: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<{ orderId: string; value: Status }>({ orderId, value: "pending" });
  const current = status.orderId === orderId ? status.value : "pending";
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      if (document.visibilityState === "hidden") { timer = setTimeout(check, 10000); return; }
      let next: Status = "unavailable";
      try {
        // Read only: only the verified server webhook may confirm a Pix payment.
        const { data, error } = await supabase.from("orders").select("payment_status,status").eq("id", orderId).maybeSingle();
        if (!error && data) {
          next = pixDisplayState(data.payment_status, data.status);
        }
      } catch { /* Keep payment unconfirmed on network errors. */ }
      if (!active) return;
      if (next === "paid") markRecoveryCompleted();
      setStatus({ orderId, value: next });
      if (next !== "paid" && next !== "closed") timer = setTimeout(check, 10000);
    }
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [orderId]);

  if (current === "paid") return <div role="status" className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5"><CheckCircle2 className="text-emerald-500" aria-hidden="true"/><h3 className="font-bold">Pagamento confirmado!</h3><p className="text-sm">Recebemos a confirmação do seu Pix. Acompanhe seu pedido em Minha conta.</p><a className="text-sm font-semibold text-primary underline" href="/conta">Acompanhar pedido</a></div>;
  if (current === "closed") return <p role="status" className="rounded-lg border p-4 text-sm"><CircleAlert aria-hidden="true" className="mb-2 h-5 w-5"/>Este Pix foi encerrado. Confira o pedido em Minha conta antes de tentar novamente.</p>;
  return <>{children}<p role="status" className="flex gap-2 text-sm text-muted-foreground"><Clock3 aria-hidden="true" className="h-5 w-5 shrink-0"/>{current === "unavailable" ? "Não conseguimos consultar a confirmação agora. Vamos tentar novamente automaticamente. Não pague duas vezes." : "Aguardando pagamento. A confirmação aparecerá aqui automaticamente após a validação do Pix."}</p></>;
}
