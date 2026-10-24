import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";
import { Panel, Pager, QueryState, field, action, Status } from "./AdminUi";
export function CouponsPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState("percent");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const query = useQuery({
    queryKey: ["admin-coupons", page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("coupons")
        .select("id,code,percent_off,amount_off,active,expires_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * 25, page * 25 + 24);
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(value.replace(",", "."));
    if (
      !/^[A-Z0-9_-]{2,40}$/.test(code) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (kind === "percent" && amount > 100)
    ) {
      setFeedback("Confira código e desconto. Percentual máximo: 100%.");
      return;
    }
    if (!window.confirm("Criar e ativar este cupom de desconto na loja?")) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("coupons")
        .insert({
          code,
          percent_off: kind === "percent" ? amount : null,
          amount_off: kind === "amount" ? amount : null,
          active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      setCode("");
      setValue("");
      setFeedback("Cupom criado.");
      void client.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(id: string, active: boolean) {
    if (!window.confirm(`${active ? "Desativar" : "Ativar"} este cupom?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ active: !active })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      setFeedback("Cupom atualizado.");
      void client.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <QueryState
        loading={query.isLoading}
        error={query.isError}
        retry={() => void query.refetch()}
      />
      {query.data && !query.isError && (
        <Panel title="Cupons da loja">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-3">Código</th>
                  <th>Desconto</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-3 font-mono">{c.code}</td>
                    <td>{c.percent_off ? `${c.percent_off}%` : brl(c.amount_off ?? 0)}</td>
                    <td>
                      <Status>
                        {!c.active
                          ? "Inativo"
                          : c.expires_at && Date.parse(c.expires_at) < Date.now()
                            ? "Expirado"
                            : "Ativo"}
                      </Status>
                    </td>
                    <td>
                      <button
                        className={action}
                        disabled={busy}
                        onClick={() => void toggle(c.id, c.active)}
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} count={query.data.count} onChange={setPage} />
        </Panel>
      )}
      <Panel title="Criar cupom">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Código
            <input
              required
              className={field + " mt-1"}
              maxLength={40}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <label className="text-sm">
            Tipo
            <select
              className={field + " mt-1"}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="percent">Percentual (%)</option>
              <option value="amount">Valor fixo (R$)</option>
            </select>
          </label>
          <label className="text-sm">
            Desconto
            <input
              required
              className={field + " mt-1"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <button type="submit" disabled={busy} className={action}>
            Criar cupom
          </button>
        </form>
      </Panel>
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
    </div>
  );
}
