import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  trackingUrl,
  trackingReady,
  trackingWhatsApp,
  trackingMessage,
  type TrackingOrder,
} from "@/lib/tracking";
import { Panel, field, action, adminDate } from "./AdminUi";
type EmailStatus = {
  configured: boolean;
  history: {
    id: string;
    state: string;
    result_code: string;
    attempts: number;
    created_at: string;
  }[];
  attempts: { state: string; result_code: string; created_at: string }[];
};
const states: Record<string, string> = {
  processing: "Em processamento — envio não confirmado",
  accepted: "Aceito pelo provedor — entrega não confirmada",
  failed: "Falhou",
  uncertain: "Resultado incerto — revisar no provedor",
  blocked: "Bloqueado por configuração",
  delivered: "Entregue",
  bounced: "Devolvido",
  complained: "Reclamação",
};
export function OrderTracking({
  order,
  onSaved,
}: {
  order: TrackingOrder;
  onSaved: () => Promise<unknown> | void;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? "");
  const [code, setCode] = useState(order.tracking_code ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState(false);
  const lock = useRef(false);
  const dirty =
    carrier !== (order.tracking_carrier ?? "") ||
    code !== (order.tracking_code ?? "") ||
    url !== (order.tracking_url ?? "");
  const email = useQuery<EmailStatus>({
    queryKey: [
      "tracking-email-status",
      order.id,
      order.tracking_carrier,
      order.tracking_code,
      order.tracking_url,
    ],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tracking-email", {
        body: { orderId: order.id, mode: "status" },
      });
      if (error || data?.error) throw new Error("Backend de e-mail indisponível.");
      return data;
    },
  });
  let whatsapp = "";
  let eligibility = "";
  try {
    trackingReady(order);
    whatsapp = trackingWhatsApp(order);
  } catch (e) {
    eligibility = (e as Error).message;
  }
  let ready = false;
  try {
    trackingReady(order);
    ready = true;
  } catch {
    /* Explain below, without changing order status. */
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const normalized = trackingUrl(url);
      const { data, error } = await supabase.rpc(
        "admin_save_tracking" as never,
        {
          p_order: order.id,
          p_carrier: carrier.trim(),
          p_code: code.trim(),
          p_url: normalized,
        } as never,
      );
      if (error) throw error;
      if (data !== true) throw new Error("O banco não confirmou o rastreamento.");
      setFeedback("Rastreamento salvo. O status financeiro e o andamento foram preservados.");
      await onSaved();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Não foi possível salvar o rastreamento.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function notify() {
    if (lock.current || !ready || dirty || !email.data?.configured) return;
    if (
      !window.confirm(
        `Notificar o rastreamento por e-mail para o destinatário registrado neste pedido (${order.customer_email})?`,
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const { data, error } = await supabase.functions.invoke("tracking-email", {
        body: { orderId: order.id, mode: "send" },
      });
      if (error) {
        const response = (error as unknown as { context?: Response }).context;
        let detail =
          "Não foi possível confirmar o envio. Consulte o histórico antes de tentar novamente.";
        try {
          const parsed = await response?.json();
          if (typeof parsed?.error === "string") detail = parsed.error;
        } catch {
          /* Generic error remains honest. */
        }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setFeedback(data?.message ?? "Consulte o histórico para verificar o resultado real.");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Não foi possível confirmar o envio.");
    } finally {
      lock.current = false;
      setBusy(false);
      void email.refetch();
    }
  }
  return (
    <Panel title="Rastreamento do pedido">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Transportadora
          <input
            className={field + " mt-1"}
            maxLength={120}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Código de rastreamento
          <input
            className={field + " mt-1"}
            maxLength={120}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Link oficial de rastreamento
          <input
            type="url"
            placeholder="https://site-oficial-da-transportadora.com.br"
            className={field + " mt-1"}
            maxLength={2048}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={action + " bg-primary text-primary-foreground"}
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          Salvar rastreamento
        </button>
        {whatsapp && !dirty ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={action}
            onClick={() =>
              setFeedback(
                "Confirme o envio no WhatsApp. A abertura do link não registra mensagem enviada.",
              )
            }
          >
            Enviar pelo WhatsApp
          </a>
        ) : (
          <button className={action} disabled>
            Enviar pelo WhatsApp
          </button>
        )}
        <button
          className={action}
          disabled={
            busy ||
            dirty ||
            !ready ||
            !email.data?.configured ||
            !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(order.customer_email)
          }
          onClick={() => void notify()}
        >
          Notificar por e-mail
        </button>
        <button className={action} disabled={!ready || dirty} onClick={() => setPreview(!preview)}>
          Prévia da mensagem
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Use o endereço oficial da transportadora. Salvar rastreamento não marca o pedido como
        enviado, entregue ou pago. As notificações ficam disponíveis após salvar os três campos e
        marcar o andamento como enviado.
      </p>
      {dirty && (
        <p className="mt-2 text-xs text-primary">
          Salve as alterações antes de abrir ou enviar a mensagem.
        </p>
      )}
      {eligibility && <p className="mt-2 text-xs text-muted-foreground">{eligibility}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        WhatsApp manual: usa exclusivamente o telefone registrado no pedido. Nenhum disparo
        automático ou em massa.
      </p>
      {email.isLoading ? (
        <p className="mt-3 text-sm">Verificando configuração de e-mail…</p>
      ) : email.isError ? (
        <div className="mt-3 text-sm">
          <p>
            Função ou migração de e-mail indisponível neste ambiente. Nenhum envio foi confirmado.
          </p>
          <button className={action + " mt-2"} onClick={() => void email.refetch()}>
            Verificar e-mail novamente
          </button>
        </div>
      ) : !email.data?.configured ? (
        <p className="mt-3 text-sm text-muted-foreground">
          E-mail pendente de configuração: Resend, remetente autorizado e liberação
          TRACKING_EMAIL_ENABLED no servidor.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Credenciais presentes. O servidor verifica o domínio do remetente antes de enviar.
        </p>
      )}
      {preview && (
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-sm">
          {trackingMessage(order)}
        </pre>
      )}
      {!!email.data?.history.length && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">Histórico de e-mails</summary>
          {email.data.history.map((item) => (
            <p className="mt-2" key={item.id}>
              {adminDate(item.created_at)} · {states[item.state] ?? item.state} · {item.attempts}{" "}
              tentativa(s) · {item.result_code}
            </p>
          ))}
          {email.data.attempts.map((item, index) => (
            <p className="mt-2 text-xs text-muted-foreground" key={index}>
              {adminDate(item.created_at)} · {states[item.state] ?? item.state} · {item.result_code}
            </p>
          ))}
        </details>
      )}
      {!email.data?.history.length && !!email.data?.attempts.length && (
        <div className="mt-3 text-xs">
          {email.data.attempts.map((item, index) => (
            <p key={index}>
              {adminDate(item.created_at)} · {states[item.state] ?? item.state} · {item.result_code}
            </p>
          ))}
        </div>
      )}
      {feedback && (
        <p role="status" className="mt-4 text-sm">
          {feedback}
        </p>
      )}
    </Panel>
  );
}
