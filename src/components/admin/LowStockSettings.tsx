import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { field, action } from "./AdminUi";
export const lowStockQuery = () => ({
  queryKey: ["admin-stock-settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("admin_preferences")
      .select("low_stock_limit")
      .eq("id", "main")
      .single();
    if (error) throw error;
    return data;
  },
  staleTime: 30000,
  refetchInterval: 60000,
});
export function LowStockSettings() {
  const client = useQueryClient();
  const query = useQuery(lowStockQuery());
  const [limit, setLimit] = useState(3);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (query.data) setLimit(query.data.low_stock_limit);
  }, [query.data]);
  async function save() {
    if (!Number.isInteger(limit) || limit < 0 || limit > 9999) {
      setFeedback("Use um inteiro entre 0 e 9999.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("admin_preferences")
        .update({ low_stock_limit: limit })
        .eq("id", "main")
        .select("low_stock_limit")
        .single();
      if (error) throw error;
      if (!data) throw new Error("A configuração não foi confirmada.");
      setFeedback("Limite compartilhado salvo. As quantidades em estoque não foram alteradas.");
      await client.invalidateQueries({ queryKey: ["admin-stock-settings"] });
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (query.isError)
    return (
      <div className="text-sm">
        <p>
          A configuração compartilhada de estoque não está disponível. Aplique a migração
          administrativa; as quantidades continuam preservadas.
        </p>
        <button className={action + " mt-2"} onClick={() => void query.refetch()}>
          Consultar limite novamente
        </button>
      </div>
    );
  return (
    <div className="max-w-md space-y-2">
      <label className="text-sm">
        Limite compartilhado de estoque baixo
        <input
          type="number"
          min={0}
          max={9999}
          step={1}
          value={limit}
          disabled={!query.data || busy}
          className={field + " mt-1"}
          onChange={(e) => setLimit(e.target.valueAsNumber)}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Usado por todos os administradores. Não altera a baixa de estoque nem as quantidades das
        variantes.
      </p>
      <button
        className={action}
        disabled={!query.data || busy || limit === query.data.low_stock_limit}
        onClick={() => void save()}
      >
        {busy ? "Salvando…" : "Salvar limite"}
      </button>
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
    </div>
  );
}
