import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createBlackcatPix } from "../_shared/blackcat.ts";
import { blackcatPixPayload } from "../_shared/blackcat-payload.ts";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" } });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  // Safety switch: never initiate a real charge before completing gateway and stock tests.
  if (Deno.env.get("BLACKCAT_PIX_ENABLED") !== "true")
    return json({ error: "Pix em preparação. Nenhuma cobrança foi criada." }, 503);

  if (!Deno.env.get("BLACKCAT_API_KEY")) return json({ error: "Gateway não configurado" }, 503);
  let createdOrderId: string | null = null;
  try {
  const token = request.headers.get("Authorization");
  if (!token?.startsWith("Bearer ")) return json({ error: "Autenticação necessária" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return json({ error: "Servidor não configurado" }, 503);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: token } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Sessão inválida" }, 401);

  // A live payment implementation must create the order atomically, calculate the amount
  // server-side, and record the gateway transaction before accepting webhooks.
  // Until those invariants are implemented and tested, fail closed.
  const admin = createClient(url, serviceKey);
  const payload = await request.json().catch(() => null);
  const customer = payload?.customer;
  const items = payload?.items;
  if (!Array.isArray(items) || !items.length || items.length > 30 ||
      items.some((item: { variant_id?: string; quantity?: number }) =>
        typeof item.variant_id !== "string" || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 10) ||
      !customer || !/^[0-9]{11}$/.test(String(customer.cpf ?? ""))) {
    return json({ error: "Dados do pedido inválidos" }, 400);
  }
  const postbackUrl = Deno.env.get("BLACKCAT_WEBHOOK_URL");
  if (!postbackUrl?.startsWith("https://")) return json({ error: "Webhook não configurado" }, 503);
  const { data: orderId, error: orderError } = await userClient.rpc("place_order", {
    _items: items, _customer: customer, _coupon: "", _method: "pix"
  });
  createdOrderId = orderId;
  if (orderError || !orderId) return json({ error: orderError?.message ?? "Falha ao criar pedido" }, 409);
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).eq("user_id", user.id).single();
  if (!order) return json({ error: "Pedido não encontrado", orderId }, 500);
  const { data: lines } = await admin.from("order_items").select("product_name,unit_price,quantity,products(categories(slug))").eq("order_id", orderId);
  const amount = Math.round(Number(order.total) * 100);
  if (!lines?.length || !Number.isSafeInteger(amount) || amount <= 0)
    return json({ error: "Pedido requer revisão", orderId }, 503);
  const charge = await createBlackcatPix(blackcatPixPayload(order, lines.map(line => ({ ...line, category_slug: line.products?.categories?.slug })), orderId, postbackUrl));
  if (!charge?.transactionId || !charge?.paymentData?.copyPaste)
    return json({ error: "Resposta do gateway requer conciliação", orderId }, 503);
  const { error: ledgerError } = await admin.from("pix_transactions").insert({
    order_id: orderId, transaction_id: charge.transactionId,
    amount_cents: amount, status: "pending",
    copy_paste: charge.paymentData.copyPaste,
    qr_code_base64: charge.paymentData.qrCodeBase64 ?? null
  });
  if (ledgerError) return json({ error: "Cobrança requer conciliação manual", orderId }, 503);
  return json({ orderId, copyPaste: charge.paymentData.copyPaste,
    qrCodeBase64: charge.paymentData.qrCodeBase64 ?? null, amountCents: amount });
  } catch {
    return json({ error: "Não foi possível concluir a geração do Pix. Verifique seu pedido antes de tentar novamente.", orderId: createdOrderId }, 503);
  }
});
