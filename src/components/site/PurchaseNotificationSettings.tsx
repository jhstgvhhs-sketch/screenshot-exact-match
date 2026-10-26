import { useState, type FormEvent } from "react";
import { ShoppingBag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { defaultPurchaseSettings, PURCHASE_SETTINGS_KEY, purchaseSettingsTable, usePurchaseNotificationSettings, validatePurchaseSettings, type PurchaseNotificationSettings as Settings } from "@/lib/purchase-notification-settings";

export function PurchaseNotificationSettings() {
  const query = usePurchaseNotificationSettings();
  const client = useQueryClient();
  return <section className="mt-8 space-y-4 rounded-xl border border-border bg-card p-5">
    <h2 className="text-xl font-bold">Mensagens promocionais</h2>
    <p className="text-sm text-muted-foreground">Avisos promocionais discretos na vitrine, independentes de compras realizadas. Não aparecem no checkout e não mostram dados de clientes.</p>
    {query.isLoading ? <p>Carregando preferências…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">As configurações ainda não estão disponíveis no banco. A publicação da configuração dos avisos precisa ser concluída antes de salvar.</p> :
      <NotificationForm key={JSON.stringify(query.data)} current={query.data ?? defaultPurchaseSettings} onSaved={() => { void client.invalidateQueries({ queryKey: PURCHASE_SETTINGS_KEY }); }}/>}
  </section>;
}

function NotificationForm({ current, onSaved }: { current: Settings; onSaved: () => void }) {
  const [fields, setFields] = useState(current);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const input = "mt-2 w-full rounded-lg border border-input bg-background p-3";
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setFeedback("");
    try {
      const values = validatePurchaseSettings(fields);
      const { data, error } = await purchaseSettingsTable().upsert({ id: "main", ...values, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou a atualização.");
      setFeedback("Preferências salvas. A vitrine atualizará os avisos em até 1 minuto."); onSaved();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível salvar as preferências."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-5">
    <fieldset disabled={busy} className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={fields.enabled} onChange={event => setFields({ ...fields, enabled: event.target.checked })}/> Ativar notificações na loja</label>
      <label className="block text-sm font-semibold">Título do aviso<input className={input} value={fields.title} maxLength={80} required onChange={event => setFields({ ...fields, title: event.target.value })}/></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Tempo na tela (segundos)<input className={input} type="number" min={3} max={20} step={1} required value={fields.display_seconds} onChange={event => setFields({ ...fields, display_seconds: event.target.valueAsNumber })}/></label>
        <label className="text-sm font-semibold">Intervalo entre avisos (segundos)<input className={input} type="number" min={15} max={300} step={1} required value={fields.interval_seconds} onChange={event => setFields({ ...fields, interval_seconds: event.target.valueAsNumber })}/></label>
      </div>
      <div className="space-y-3"><h3 className="font-semibold">Mensagens que podem aparecer</h3><p className="text-xs text-muted-foreground">As mensagens ativas se alternam no intervalo configurado. Use textos sobre os produtos, sem simular compras, clientes ou pagamentos.</p>
        {fields.messages.map((message, index) => <div key={index} className="space-y-2 rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={message.enabled} onChange={event => setFields({ ...fields, messages: fields.messages.map((value, i) => i === index ? { ...value, enabled: event.target.checked } : value) })}/> Exibir mensagem {index + 1}</label>
          <label className="block text-sm">Texto da mensagem {index + 1}<textarea rows={2} className={input} maxLength={180} required value={message.text} onChange={event => setFields({ ...fields, messages: fields.messages.map((value, i) => i === index ? { ...value, text: event.target.value } : value) })}/></label>
          <button type="button" disabled={fields.messages.length === 1} className="text-xs text-destructive underline disabled:opacity-40" onClick={() => setFields({ ...fields, messages: fields.messages.filter((_, i) => i !== index) })}>Remover mensagem {index + 1}</button>
        </div>)}
        <button type="button" disabled={fields.messages.length >= 6} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40" onClick={() => setFields({ ...fields, messages: [...fields.messages, { text: "", enabled: true }] })}>Adicionar mensagem</button>
      </div>
      <div className="rounded-lg border border-primary/30 bg-background p-4"><p className="mb-3 text-xs text-muted-foreground">Prévia da mensagem promocional</p><div className="flex gap-3"><ShoppingBag aria-hidden="true" className="h-6 w-6 shrink-0 text-primary"/><div><p className="text-sm font-bold">{fields.title}</p><p className="mt-1 text-sm">{fields.messages.find(message => message.enabled)?.text || "Nenhuma mensagem ativa"}</p><p className="mt-1 text-xs text-muted-foreground">Mensagem do sistema</p></div></div></div>
      <button type="submit" className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">{busy ? "Salvando…" : "Salvar notificações"}</button>
    </fieldset>
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
  </form>;
}
