import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import {
  getBluePagPayment,
  verifyBluePagWebhookSignature,
} from "./bluepag.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // A assinatura é calculada sobre o corpo original, antes de qualquer parse JSON.
  const rawBody = await req.text();
  const validSignature = await verifyBluePagWebhookSignature(
    rawBody,
    req.headers.get("X-Webhook-Signature"),
  );
  if (!validSignature) return json({ error: "Assinatura inválida" }, 401);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Payload inválido" }, 400);
    }
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const event = String(body.event ?? body.type ?? "");
  if (event !== "transaction.completed" && event !== "transaction.failed") {
    // Eventos de saque não pertencem ao fluxo de recebimento PIX da loja.
    return json({ ok: true, ignored: true });
  }

  const data = body.data && typeof body.data === "object"
    ? body.data as Record<string, unknown>
    : {};
  const transactionUuid =
    data.transaction_uuid ?? data.uuid ?? body.transaction_uuid ?? body.uuid;
  if (typeof transactionUuid !== "string" ||
      transactionUuid.length < 8 || transactionUuid.length > 128) {
    return json({ error: "UUID da transação ausente" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook não configurado" }, 503);
  }

  try {
    // Não confiamos no status do callback: consultamos a transação na API autenticada.
    const gatewayPayment = await getBluePagPayment(transactionUuid);
    if (gatewayPayment.uuid !== transactionUuid || gatewayPayment.type !== "pix") {
      return json({ error: "Transação BluePag incompatível" }, 409);
    }
    if (gatewayPayment.amountBRL === null ||
        !Number.isFinite(gatewayPayment.amountBRL) ||
        gatewayPayment.amountBRL <= 0) {
      return json({ error: "Valor da transação indisponível" }, 409);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: payment, error: lookupError } = await admin
      .from("pix_transactions")
      .select("order_id, amount_cents, status")
      .eq("transaction_id", transactionUuid)
      .maybeSingle();

    if (lookupError) {
      console.error(JSON.stringify({ fn: "bluepag-webhook", stage: "ledger-lookup" }));
      return json({ error: "Não foi possível localizar o registro do PIX" }, 503);
    }
    if (!payment) return json({ error: "Transação não reconhecida" }, 404);

    const amountCents = Math.round(gatewayPayment.amountBRL * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents !== payment.amount_cents) {
      return json({ error: "Valor da transação não confere" }, 409);
    }

    if (gatewayPayment.status === "pending") {
      return json({ ok: true, pending: true });
    }

    const gatewayStatus = gatewayPayment.status === "paid" ? "paid" : "cancelled";
    const { data: settlement, error: settlementError } = await admin.rpc("settle_pix_order", {
      p_order_id: payment.order_id,
      p_transaction_id: transactionUuid,
      p_amount_cents: payment.amount_cents,
      p_gateway_status: gatewayStatus,
    });

    if (settlementError) {
      console.error(JSON.stringify({ fn: "bluepag-webhook", stage: "settlement" }));
      return json({ error: "Não foi possível atualizar o pedido" }, 503);
    }

    if (["manual_review", "mismatch", "unknown_order"].includes(String(settlement))) {
      return json({ error: "Transação exige conciliação manual" }, 409);
    }
    return json({ ok: true, result: settlement });
  } catch (error) {
    // Logs contêm apenas etapa e status; nunca imprimimos credenciais ou dados pessoais.
    console.error(JSON.stringify({
      fn: "bluepag-webhook",
      stage: "provider-verification",
      error: error instanceof Error ? error.name : "UnknownError",
    }));
    return json({ error: "Não foi possível verificar a transação na BluePag" }, 503);
  }
});
