import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // WebPag's documented business webhook is configured in its dashboard.
    // It delivers the payment resource; we never trust callback status alone.
    const paymentId = body?.data?.id ?? body?.payment_id ?? body?.id;
    if ((typeof paymentId !== "string" && typeof paymentId !== "number") ||
        !/^[0-9]{1,20}$/.test(String(paymentId))) {
      return json({ error: "Invalid payment notification" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("BLUEPAG_API_KEY");
    if (!url || !serviceKey || !apiKey) return json({ error: "Webhook não configurado" }, 503);

    const response = await fetch(`https://api.bluepag.com.br/api/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { accept: "application/json", "content-type": "application/json", "auth-token": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.data?.id) {
      console.error(JSON.stringify({ fn: "bluepag-webhook", stage: "provider-lookup", httpStatus: response.status }));
      return json({ error: "Payment verification unavailable" }, 503);
    }

    const data = result.data;
    const pix = data.pix;
    if (!pix || !pix.uuid || Number(data.status) === 0) return json({ error: "PIX payment not found" }, 404);

    const admin = createClient(url, serviceKey);
    const { data: payment, error } = await admin.from("pix_transactions")
      .select("order_id,amount_cents,status")
      .eq("transaction_id", String(pix.uuid))
      .maybeSingle();
    if (error) return json({ error: "Payment lookup unavailable" }, 503);
    if (!payment) return json({ error: "Unknown transaction" }, 404);

    const grossCents = Math.round(Number(pix.amount) * 100);
    if (!Number.isFinite(grossCents) || grossCents !== payment.amount_cents ||
        String(data.method_slug ?? "").toLowerCase() !== "pix") {
      return json({ error: "Payment verification mismatch" }, 409);
    }

    const status = Number(data.status);
    const next = status === 40 ? "paid" : status === 60 || status === 30 ? "cancelled" : null;
    if (!next) return json({ ok: true, pending: true });

    const { data: settlement, error: settleError } = await admin.rpc("settle_pix_order", {
      p_order_id: payment.order_id,
      p_transaction_id: String(pix.uuid),
      p_amount_cents: payment.amount_cents,
      p_gateway_status: next,
    });
    if (settleError) {
      console.error(JSON.stringify({ fn: "bluepag-webhook", stage: "settlement", httpStatus: 0 }));
      return json({ error: "Settlement unavailable" }, 503);
    }
    if (["manual_review", "mismatch", "unknown_order"].includes(String(settlement))) {
      return json({ error: "Payment requires manual reconciliation" }, 409);
    }
    return json({ ok: true, result: settlement });
  } catch {
    console.error(JSON.stringify({ fn: "bluepag-webhook", stage: "verification", httpStatus: 0 }));
    return json({ error: "Could not verify provider notification" }, 503);
  }
});
