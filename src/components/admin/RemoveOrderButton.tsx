import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
export function RemoveOrderButton({
  orderId,
  archived = false,
  disabled = false,
}: {
  orderId: string;
  archived?: boolean;
  disabled?: boolean;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    if (busy || archived || disabled) return;
    if (
      !window.confirm(
        `Retirar o pedido #${orderId.slice(0, 8).toUpperCase()} da lista principal? Ele ficará arquivado. Pagamentos, valores, estoque e histórico do cliente serão preservados.`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("archive_order_admin", { p_order_id: orderId });
      if (error) throw error;
      if (data !== true) throw new Error("O banco não confirmou a remoção da lista.");
      setMessage("Pedido retirado da lista principal. Consulte-o em Incluir arquivados.");
      await Promise.all(
        ["admin-orders", "admin-order-detail", "admin-customers"].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível retirar o pedido da lista.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy || archived || disabled}
        onClick={() => void remove()}
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {busy ? "Removendo…" : "Apagar da lista"}
      </button>
      {message && (
        <p role="status" className="max-w-sm text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
