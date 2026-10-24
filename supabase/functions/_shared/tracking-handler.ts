import type { adminClient } from "./recovery-server.ts";
import { sha256 } from "./recovery-rules.ts";
import { trackingReady, trackingEmail, type TrackingOrder } from "./tracking-rules.ts";
import {
  emailConfigured,
  sendTrackingEmail,
  type EmailConfig,
  type EmailResult,
} from "./tracking-email.ts";
type DB = ReturnType<typeof adminClient>;
type Dependencies = {
  authorize: (request: Request) => Promise<string>;
  db: () => DB;
  config: () => EmailConfig;
  fetcher?: typeof fetch;
};
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const fields =
  "id,customer_name,customer_email,customer_phone,status,tracking_carrier,tracking_code,tracking_url";
export function trackingHandler(deps: Dependencies) {
  return async (request: Request) => {
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
    let actor: string;
    try {
      actor = await deps.authorize(request);
    } catch {
      return reply({ error: "Acesso administrativo necessário." }, 403);
    }
    try {
      const raw = await request.text();
      if (raw.length > 8192) return reply({ error: "Requisição muito grande." }, 413);
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply({ error: "Requisição inválida." }, 400);
      }
      if (
        !body ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => !["orderId", "mode"].includes(key)) ||
        typeof body.orderId !== "string" ||
        !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(body.orderId) ||
        !["status", "test", "send"].includes(String(body.mode))
      )
        return reply(
          { error: "Informe pedido e operação válidos. Destinatários não podem ser substituídos." },
          400,
        );
      const db = deps.db();
      const { data: order, error } = await db
        .from("orders")
        .select(fields)
        .eq("id", body.orderId)
        .single();
      if (error || !order) return reply({ error: "Pedido indisponível." }, 404);
      const config = deps.config();
      const configured = emailConfigured(config);
      const o = order as TrackingOrder;
      if (body.mode === "status") {
        const [history, attempts] = await Promise.all([
          db
            .from("tracking_email_notifications")
            .select("id,state,result_code,http_status,attempts,created_at,updated_at")
            .eq("order_id", o.id)
            .order("created_at", { ascending: false })
            .limit(10),
          db
            .from("tracking_email_attempts")
            .select("state,result_code,http_status,created_at")
            .eq("order_id", o.id)
            .order("created_at", { ascending: false })
            .limit(15),
        ]);
        if (history.error || attempts.error)
          return reply({ error: "A migração de notificações ainda não está disponível." }, 503);
        return reply({
          configured,
          reason: configured
            ? "configured_domain_checked_on_send"
            : "configure_resend_and_authorized_sender",
          history: history.data,
          attempts: attempts.data,
        });
      }
      try {
        trackingReady(o);
      } catch (e) {
        return reply({ error: (e as Error).message }, 422);
      }
      if (!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(o.customer_email))
        return reply({ error: "O pedido não possui um e-mail válido." }, 422);
      if (body.mode === "test")
        return reply({
          dryRun: true,
          configured,
          preview: trackingEmail(o),
          message:
            "Prévia local do pedido: nenhum provedor foi chamado e nenhum envio foi registrado.",
        });
      async function record(state: string, code: string, id: string | null = null, http?: number) {
        const { error } = await db.from("tracking_email_attempts").insert({
          order_id: o.id,
          notification_id: id,
          actor_id: actor,
          state,
          result_code: code,
          http_status: http ?? null,
        });
        if (error) throw new Error("audit_storage_unavailable");
      }
      if (!configured) {
        await record("blocked", "email_configuration_missing");
        return reply(
          {
            error:
              "E-mail não configurado. Configure Resend, remetente autorizado e TRACKING_EMAIL_ENABLED no servidor. Nenhum e-mail foi enviado.",
          },
          412,
        );
      }
      const fingerprint = await sha256(
        JSON.stringify([
          o.id,
          o.customer_email.trim(),
          o.customer_name,
          o.tracking_carrier,
          o.tracking_code,
          o.tracking_url,
        ]),
      );
      const { data: claim, error: claimError } = await db.rpc("tracking_email_claim", {
        p_order: o.id,
        p_fingerprint: fingerprint,
      });
      if (claimError || !claim?.notification)
        return reply(
          { error: "Não foi possível registrar a tentativa. Nenhum novo envio foi iniciado." },
          503,
        );
      const notification = claim.notification;
      if (!claim.claimed)
        return reply({
          duplicate: true,
          state: notification.state,
          message: ["accepted", "delivered"].includes(notification.state)
            ? "Este rastreamento já foi aceito pelo provedor. Não foi reenviado."
            : "Existe uma tentativa anterior. Consulte o histórico; resultados incertos não são reenviados automaticamente.",
        });
      await record("processing", "request_claimed", notification.id);
      // A change after opening the page cannot redirect the message or send outdated tracking.
      const latest = await db.from("orders").select(fields).eq("id", o.id).single();
      let unchanged = false;
      if (latest.data && !latest.error) {
        try {
          trackingReady(latest.data as TrackingOrder);
          unchanged =
            (await sha256(
              JSON.stringify([
                latest.data.id,
                latest.data.customer_email.trim(),
                latest.data.customer_name,
                latest.data.tracking_carrier,
                latest.data.tracking_code,
                latest.data.tracking_url,
              ]),
            )) === fingerprint;
        } catch {
          /* Not currently eligible. */
        }
      }
      const result: EmailResult = unchanged
        ? await sendTrackingEmail(o, notification.id, config, deps.fetcher)
        : { state: "failed" as const, code: "order_changed_review_before_retry" };
      const saved = await db
        .from("tracking_email_notifications")
        .update({
          state: result.state,
          result_code: result.code,
          http_status: result.http ?? null,
          provider_id: result.providerId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", notification.id)
        .eq("state", "processing")
        .select("id")
        .single();
      if (saved.error || !saved.data) throw new Error("result_storage_unavailable");
      await record(result.state, result.code, notification.id, result.http);
      return reply(
        {
          state: result.state,
          message:
            result.state === "accepted"
              ? "E-mail aceito pelo Resend. A entrega ao destinatário ainda não foi confirmada."
              : result.state === "uncertain"
                ? "Resultado incerto. Não reenvie sem conferir o provedor."
                : "O envio não foi aceito. Consulte o histórico e a configuração.",
        },
        result.state === "accepted" ? 200 : result.state === "uncertain" ? 202 : 502,
      );
    } catch {
      return reply(
        {
          error:
            "Não foi possível confirmar a operação. Consulte o histórico antes de tentar novamente.",
        },
        503,
      );
    }
  };
}
