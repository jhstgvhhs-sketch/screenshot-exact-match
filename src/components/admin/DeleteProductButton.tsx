import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { action } from "./AdminUi";
export function DeleteProductButton({
  product,
  onDeleted,
}: {
  product: { id: string; name: string };
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  async function remove() {
    if (
      pending.current ||
      !window.confirm(
        `Excluir definitivamente "${product.name}" e todas as suas cores? Esta ação não pode ser desfeita. Produtos com pedidos ou avaliações vinculados são protegidos.`,
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc(
        "admin_delete_unused_product" as never,
        { p_product: product.id } as never,
      );
      if (error) {
        if (error.code === "P0001") setMessage(error.message);
        else
          setMessage(
            "Não foi possível excluir o produto. Confira sua sessão administrativa e tente novamente.",
          );
        return;
      }
      if (data !== true) {
        setMessage("O banco não confirmou a exclusão. Atualize a lista antes de tentar novamente.");
        return;
      }
      onDeleted();
    } catch {
      setMessage("Não foi possível excluir o produto. Atualize a lista e tente novamente.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="max-w-xs">
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        aria-label={`Excluir produto ${product.name}`}
        className={action + " border-destructive text-destructive"}
      >
        {busy ? "Excluindo..." : "Excluir produto"}
      </button>
      {message && (
        <p role="alert" className="mt-2 text-xs leading-relaxed">
          {message}
        </p>
      )}
    </div>
  );
}
