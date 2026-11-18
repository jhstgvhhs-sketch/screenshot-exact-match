import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createBluePagPix } from "./bluepag.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" }
});


// Secure log: function, stage and order id only. Never secrets, customer data or gateway payloads.
const logFailure = (stage: string, orderId: string | null, extra: Record<string, unknown> = {}) =>
  console.error(JSON.stringify({ fn: "bluepag-create-pix", stage, orderId, ...extra }));

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  // Safety switch: never initiate a real charge before completing gateway and stock tests.
  if (Deno.env.get("BLUEPAG_PIX_ENABLED") !== "true")
    return json({ error: "Pix em preparação. Nenhuma cobrança foi criada." }, 503);

  if (!Deno.env.get("BLUEPAG_CLIENT_ID") || !Deno.env.get("BLUEPAG_CLIENT_SECRET")) return json({ error: "Gateway não configurado" }, 503);
  let createdOrderId: string | null = null;
  let gatewayCalled = false;
  // deno-lint-ignore no-explicit-any
  let admin: ReturnType<typeof createClient<any>> | null = null;
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

    // Liberação temporária restrita ao e-mail autorizado para o teste real.
    const allowedEmails = (Deno.env.get("BLUEPAG_PIX_ALLOWED_EMAILS") ?? "")
      .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!user.email || !allowedEmails.includes(user.email.toLowerCase()))
      return json({ error: "Pix indisponível para esta conta. Nenhuma cobrança foi criada." }, 403);

    admin = createClient(url, serviceKey);
    const payload = await request.json().catch(() => null);
    const customer = payload?.customer;
    const items = payload?.items;
    if (!Array.isArray(items) || !items.length || items.length > 30 ||
        items.some((item: { variant_id?: string; quantity?: number }) =>
          typeof item.variant_id !== "string" || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 10) ||
        !customer || !/^[0-9]{11}$/.test(String(customer.cpf ?? ""))) {
      return json({ error: "Dados do pedido inválidos" }, 400);
    }
    const postbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/bluepag-webhook`;
    if (!postbackUrl?.startsWith("https://")) return json({ error: "Webhook não configurado" }, 503);

    // ---- Phase 1: full read-only validation BEFORE any order exists ----
    // Prices, stock, shipping rules and coupon come from the database, never from the browser.
    const variantIds = [...new Set(items.map((item: { variant_id: string }) => item.variant_id))];
    const { data: variants, error: variantError } = await admin
      .from("product_variants")
      .select("id,products(name,slug,price,active,categories(slug))")
      .in("id", variantIds);
    if (variantError || !variants || variants.length !== variantIds.length)
      return json({ error: "Produto indisponível" }, 400);
    const lines: { product_name: string; product_slug: string; unit_price: number | string; quantity: number; category_slug: string | null }[] = [];
    for (const item of items as { variant_id: string; quantity: number }[]) {
      const variant = variants.find((row: { id: string }) => row.id === item.variant_id);
      const product = (variant as unknown as { products?: { name: string; slug: string; price: number | string; active: boolean; categories?: { slug: string } | null } | null })?.products;
      if (!product?.active) return json({ error: "Produto indisponível" }, 400);
      lines.push({ product_name: product.name, product_slug: product.slug, unit_price: product.price, quantity: item.quantity, category_slug: product.categories?.slug ?? null });
    }
    // ---- Phase 2: create the order (database computes the authoritative totals) ----
    const { data: orderId, error: orderError } = await userClient.rpc("place_order", {
      _items: items, _customer: customer, _coupon: String(customer.coupon_code ?? "") || null, _method: "pix"
    });
    if (orderError || !orderId) return json({ error: orderError?.message ?? "Falha ao criar pedido" }, 409);
    createdOrderId = orderId as string;

    // ---- Phase 3: verify the persisted order before charging ----
    const { data: order, error: orderReadError } = await admin.from("orders")
      .select("id,user_id,total,customer_name,customer_email,customer_cpf")
      .eq("id", orderId).eq("user_id", user.id).single();
    const { data: dbLines, error: linesReadError } = await admin.from("order_items")
      .select("product_name,unit_price,quantity,product_id").eq("order_id", orderId);
    const amount = Math.round(Number(order?.total) * 100);
    try {
      if (orderReadError) throw new Error(`order-read-failed:${orderReadError.code ?? "unknown"}`);
      if (linesReadError) throw new Error(`order-items-read-failed:${linesReadError.code ?? "unknown"}`);
      if (!order) throw new Error("order-not-found");
      if (!dbLines?.length) throw new Error("order-items-empty");
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("invalid-order-total");
      if (dbLines.some(line => !line.product_id || !Number.isInteger(line.quantity) || line.quantity < 1))
        throw new Error("invalid-order-items");
      if (!String(order.customer_name ?? "").trim() || !String(order.customer_email ?? "").trim() ||
          !/^\\d{11}$/.test(String(order.customer_cpf ?? "").replace(/\\D/g, "")))
        throw new Error("invalid-order-customer");
    } catch (validationError) {
      // Nothing was sent to the gateway: cancel the order and restore stock, leaving no orphan.
      const { error: releaseError } = await admin.rpc("release_unpaid_order_stock", { p_order_id: orderId, p_payment_status: "cancelado" });
      logFailure("post-order-validation", orderId, {
        compensated: !releaseError,
        reason: validationError instanceof Error ? validationError.message : "invalid",
      });
      return json({ error: "Não foi possível gerar o Pix agora. Nenhuma cobrança foi criada e o pedido foi cancelado." }, 503);
    }

    // ---- Phase 4: create the charge at the gateway ----
    gatewayCalled = true;
    let charge;
    try {
      charge = await createBluePagPix({
        amount: Number((amount / 100).toFixed(2)),
        payer_name: String(order.customer_name),
        payer_email: String(order.customer_email),
        payer_cpf: String(order.customer_cpf).replace(/\D/g, ""),
        description: `Pedido 3DFLEX ${String(orderId).slice(0, 8)}`,
        postback_url: postbackUrl,
      });
    } catch {
      // Uncertain state: the gateway may have received the charge. Do NOT cancel — reconcile.
      logFailure("gateway-call", orderId);
      return json({ error: "Resposta do gateway requer conciliação", orderId }, 503);
    }
    if (!charge?.transactionId || !charge?.copyPaste) {
      logFailure("gateway-response", orderId);
      return json({ error: "Resposta do gateway requer conciliação", orderId }, 503);
    }

    // ---- Phase 5: ledger ----
    const { error: ledgerError } = await admin.from("pix_transactions").insert({
      order_id: orderId, transaction_id: charge.transactionId,
      amount_cents: amount, status: "pending",
      copy_paste: charge.copyPaste,
      qr_code_base64: null
    });
    if (ledgerError) {
      // The charge exists at the gateway but the ledger row is missing: manual reconciliation.
      logFailure("ledger-insert", orderId, { transactionId: String(charge.transactionId).slice(0, 64) });
      return json({ error: "Cobrança requer conciliação manual", orderId }, 503);
    }
    return json({ orderId, copyPaste: charge.copyPaste,
      qrCodeBase64: null, amountCents: amount });
  } catch {
    if (createdOrderId && !gatewayCalled && admin) {
      // Unexpected failure before the gateway call: cancel the order and restore stock.
      const { error: releaseError } = await admin.rpc("release_unpaid_order_stock", { p_order_id: createdOrderId, p_payment_status: "cancelado" });
      logFailure("unexpected-pre-charge", createdOrderId, { compensated: !releaseError });
      return json({ error: "Não foi possível gerar o Pix agora. Nenhuma cobrança foi criada e o pedido foi cancelado." }, 503);
    }
    logFailure("unexpected", createdOrderId);
    return json({ error: "Não foi possível concluir a geração do Pix. Verifique seu pedido antes de tentar novamente.", orderId: createdOrderId }, 503);
  }
});
