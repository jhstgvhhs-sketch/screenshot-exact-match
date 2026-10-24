import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type GatewayConfig = {
  id: string;
  provider: string;
  environment: string;
  pix_enabled: boolean;
  updated_at?: string;
};
const gatewayTable = () => (supabase as unknown as SupabaseClient).from("payment_gateway_settings");
const options = [
  { value: "none", label: "Nenhum" },
  { value: "blackcat", label: "Blackcat Pay" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "asaas", label: "Asaas" },
  { value: "custom", label: "Outro gateway (requer adaptador de API)" },
];
export function PaymentGatewaySettings() {
  const client = useQueryClient();
  const query = useQuery<GatewayConfig | null>({
    queryKey: ["admin-payment-gateway"],
    retry: 1,
    queryFn: async () => {
      const { data, error } = await gatewayTable()
        .select("id,provider,environment,pix_enabled,updated_at")
        .eq("id", "main")
        .maybeSingle();
      if (error) throw error;
      return data as GatewayConfig | null;
    },
  });
  if (query.isLoading) return <p className="mt-8">Carregando configurações de pagamento...</p>;
  if (query.isError || !query.data)
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold">Gateway de pagamento</h2>
        <p role="alert" className="mt-3 text-sm text-destructive">
          Não foi possível carregar as preferências do gateway. Verifique sua sessão administrativa
          e a instalação da tabela payment_gateway_settings. Isso não altera a integração de
          pagamento existente.
        </p>
        <button
          type="button"
          className="mt-3 text-sm text-primary underline"
          onClick={() => void query.refetch()}
        >
          Consultar configurações novamente
        </button>
      </section>
    );
  return (
    <GatewayForm
      key={JSON.stringify(query.data)}
      current={query.data}
      onSaved={() => void client.invalidateQueries({ queryKey: ["admin-payment-gateway"] })}
    />
  );
}
function GatewayForm({ current, onSaved }: { current: GatewayConfig; onSaved: () => void }) {
  const [provider, setProvider] = useState(current.provider);
  const [environment, setEnvironment] = useState(current.environment);
  const [pix, setPix] = useState(current.pix_enabled);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function save() {
    if (
      !window.confirm(
        "Salvar estas preferências? As credenciais e a liberação efetiva da cobrança continuam configuradas separadamente no servidor.",
      )
    )
      return;
    setBusy(true);
    setFeedback("");
    try {
      const { data, error } = await gatewayTable()
        .upsert(
          {
            id: "main",
            provider,
            environment,
            pix_enabled: pix && provider !== "none",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou o salvamento.");
      setFeedback(
        "Preferências salvas. Nenhuma cobrança foi criada; as credenciais e a liberação do gateway no servidor não foram alteradas.",
      );
      onSaved();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível salvar as preferências.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">Configuração de gateway Pix</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Preferências do gateway. As chaves e a confirmação dos pagamentos são controladas pelo
        servidor.
      </p>
      <fieldset disabled={busy} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Gateway
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background p-3"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ambiente
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background p-3"
            >
              <option value="sandbox">Teste / Sandbox</option>
              <option value="production">Produção</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pix}
            onChange={(e) => setPix(e.target.checked)}
            disabled={provider === "none"}
          />{" "}
          Preferência para aceitar Pix neste gateway
        </label>
        <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
          Esta tela não recebe segredos e não verifica credenciais. Salvar preferências não ativa
          nem desativa automaticamente a Blackcat no servidor. Outros provedores exigem integração
          antes de processar pagamentos.
        </p>
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Salvando..." : "Salvar configurações de pagamento"}
        </button>
      </fieldset>
      {feedback && (
        <p role="status" className="mt-3 text-sm">
          {feedback}
        </p>
      )}
    </section>
  );
}
