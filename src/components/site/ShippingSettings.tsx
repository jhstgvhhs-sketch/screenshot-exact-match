import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from "@/lib/shipping";
import { useShippingSettings } from "@/lib/shipping-settings";

const shippingSettingsTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from("shipping_settings");

export function ShippingSettingsEditor() {
  const queryClient = useQueryClient();
  const query = useShippingSettings();

  if (query.isLoading) return <p className="mt-8">Carregando configuração de frete...</p>;
  if (query.isError || !query.data) {
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold">Configuração de frete</h2>
        <p role="alert" className="mt-3 text-sm text-destructive">
          A tabela de configuração do frete não está disponível no banco conectado à loja.
          Publicar o código do site não cria essa tabela automaticamente.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          A migração SQL está no repositório. Aplique esse arquivo no banco Supabase usado pela loja
          e depois tente novamente. Nenhuma alteração de frete foi salva.
        </p>
        <a
          href="https://github.com/jhstgvhhs-sketch/screenshot-exact-match/blob/main/supabase/migrations/20261028000001_configurable_shipping.sql"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-primary underline"
        >
          Abrir migração SQL no GitHub
        </a>
        <div>
          <button
            type="button"
            className="mt-3 rounded-lg border border-input px-4 py-2 text-sm font-semibold"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  return (
    <ShippingSettingsForm
      current={query.data}
      onSaved={() => void queryClient.invalidateQueries({ queryKey: ["shipping-settings"] })}
    />
  );
}

function ShippingSettingsForm({
  current,
  onSaved,
}: {
  current: ShippingSettings;
  onSaved: () => void;
}) {
  const [fixedShipping, setFixedShipping] = useState(String(current.fixed_shipping_brl));
  const [freePixEnabled, setFreePixEnabled] = useState(current.free_pix_shipping_enabled);
  const [freePixThreshold, setFreePixThreshold] = useState(
    String(current.free_pix_shipping_threshold_brl),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    const fixed = Number(fixedShipping.replace(",", "."));
    const threshold = Number(freePixThreshold.replace(",", "."));
    if (!Number.isFinite(fixed) || fixed < 0 || fixed > 5000) {
      setMessage("Informe um frete fixo entre R$ 0,00 e R$ 5.000,00.");
      return;
    }
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1_000_000) {
      setMessage("Informe um limite de frete grátis entre R$ 0,00 e R$ 1.000.000,00.");
      return;
    }
    if (
      !window.confirm(
        "Salvar as regras de frete? A alteração afeta os valores exibidos no checkout e calculados no servidor para novos pedidos.",
      )
    ) return;

    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await shippingSettingsTable()
        .upsert(
          {
            id: "main",
            fixed_shipping_brl: Math.round(fixed * 100) / 100,
            free_pix_shipping_enabled: freePixEnabled,
            free_pix_shipping_threshold_brl: Math.round(threshold * 100) / 100,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou a configuração.");
      setMessage(
        "Frete atualizado. O checkout e os novos pedidos Pix usarão estas regras quando a migração estiver aplicada no backend.",
      );
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a configuração de frete.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">Configurar frete</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Defina o valor cobrado nos pedidos sem impressoras e a regra de frete grátis no Pix.
          As impressoras continuam com frete grátis em qualquer forma de pagamento.
        </p>
      </div>

      <div role="note" className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
        <p className="font-semibold">Atenção ao testar o Pix</p>
        <p className="mt-1 text-muted-foreground">
          Definir o frete como R$ 0,00 torna o frete grátis para novos pedidos sem impressoras,
          inclusive pedidos reais. Depois do teste, restaure o valor comercial desejado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Frete fixo (R$)
          <input
            aria-label="Frete fixo (R$)"
            type="number"
            min="0"
            max="5000"
            step="0.01"
            value={fixedShipping}
            disabled={busy}
            onChange={(event) => setFixedShipping(event.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Use R$ 0,00 para testar sem adicionar frete ao valor do Pix.
          </span>
        </label>
        <label className="block text-sm font-semibold">
          Limite do frete grátis no Pix (R$)
          <input
            aria-label="Limite do frete grátis no Pix (R$)"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={freePixThreshold}
            disabled={busy || !freePixEnabled}
            onChange={(event) => setFreePixThreshold(event.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            A regra vale para subtotal estritamente acima deste valor.
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
        <input
          type="checkbox"
          checked={freePixEnabled}
          disabled={busy}
          onChange={(event) => setFreePixEnabled(event.target.checked)}
          className="mt-1 accent-primary"
        />
        <span>
          <span className="font-semibold">Frete grátis no Pix acima do limite</span>
          <span className="mt-1 block text-muted-foreground">
            Quando desativado, os pedidos sem impressoras pagam o frete fixo configurado,
            independentemente do subtotal e da forma de pagamento.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setFixedShipping("0.00");
            setMessage("Frete zero preenchido para teste. Clique em Salvar configuração para aplicar.");
          }}
          className="rounded-lg border border-input px-4 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          Preparar frete zero para teste
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setFixedShipping(String(DEFAULT_SHIPPING_SETTINGS.fixed_shipping_brl));
            setFreePixEnabled(DEFAULT_SHIPPING_SETTINGS.free_pix_shipping_enabled);
            setFreePixThreshold(String(DEFAULT_SHIPPING_SETTINGS.free_pix_shipping_threshold_brl));
            setMessage("Valores padrão preenchidos. Clique em Salvar configuração para restaurá-los.");
          }}
          className="rounded-lg border border-input px-4 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          Restaurar valores padrão
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Salvando..." : "Salvar configuração de frete"}
        </button>
      </div>

      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  );
}
