import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createBlackcatPix } from "../_shared/blackcat.ts";
import { blackcatPixPayload, pixShippingCents, type PixShippingRules } from "../_shared/blackcat-payload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" }
});

const cents = (value: number | string) => Math.round(Number(value) * 100);
const stripAccents = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Secure log: function, stage and order id only. Never secrets, customer data or gateway payloads.
const logFailure = (stage: string, orderId: string | null, extra: Record<string, unknown> = {}) =>
  console.error(JSON.stringify({ fn: "blackcat-create-pix", stage, orderId, ...extra }));

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  // Safety switch: never initiate a real charge before completing gateway and stock tests.
  if (Deno.env.get("BLACKCAT_PIX_ENABLED") !== "true")
    return json({ error: "Pix em preparação. Nenhuma cobrança foi criada." }, 503);

  if (!Deno.env.get("BLACKCAT_API_KEY")) return json({ error: "Gateway não configurado" }, 503);
  let createdOrderId: string | null = null;
  let gatewayCalled = false;
  let admin: ReturnType<typeof createClient> | null = null;
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
    const postbackUrl = Deno.env.get("BLACKCAT_WEBHOOK_URL");
    if (!postbackUrl?.startsWith("https://")) return json({ error: "Webhook não configurado" }, 503);

    // ---- Phase 1: full read-only validation BEFORE any order exists ----
    // Prices, stock, shipping rules and coupon come from the database, never from the browser.
    const variantIds = [...new Set(items.map((item: { variant_id: string }) => item.variant_id))];
    const { data: variants, error: variantError } = await admin
      .from("product_variants")
      .select("id,products(name,price,active,categories(slug))")
      .in("id", variantIds);
    if (variantError || !variants || variants.length !== variantIds.length)
      return json({ error: "Produto indisponível" }, 400);
    const lines: { product_name: string; unit_price: number | string; quantity: number; category_slug: string | null }[] = [];
    for (const item of items as { variant_id: string; quantity: number }[]) {
      const variant = variants.find((row: { id: string }) => row.id === item.variant_id);
      const product = (variant as { products?: { name: string; price: number | string; active: boolean; categories?: { slug: string } | null } | null })?.products;
      if (!product?.active) return json({ error: "Produto indisponível" }, 400);
      lines.push({ product_name: product.name, unit_price: product.price, quantity: item.quantity, category_slug: product.categories?.slug ?? null });
    }
    const subtotalCents = lines.reduce((sum, line) => sum + cents(line.unit_price) * line.quantity, 0);

    const { data: ship } = await admin.from("shipping_settings")
      .select("fixed_shipping_brl,free_pix_shipping_enabled,free_pix_shipping_threshold_brl")
      .eq("id", "main").maybeSingle();
    const rules: PixShippingRules = {
      fixedShippingCents: cents(ship?.fixed_shipping_brl ?? 37.8),
      freeThresholdCents: cents(ship?.free_pix_shipping_threshold_brl ?? 600),
      freeEnabled: ship?.free_pix_shipping_enabled ?? true,
    };

    // Coupon: same rules as place_order, resolved before creating any record.
    let discountCents = 0;
    const rawCoupon = String(customer.coupon_code ?? "").trim();
    const coupon = stripAccents(rawCoupon).toUpperCase() === "KITCONSERVACAO" ? "KITCONSERVACAO" : rawCoupon.toUpperCase();
    if (coupon) {
      const { data: coupons } = await admin.from("coupons").select("code,percent_off,amount_off,expires_at").eq("active", true);
      const now = Date.now();
      const found = (coupons ?? []).find((row: { code: string; expires_at: string | null }) =>
        row.code.toUpperCase() === coupon && (!row.expires_at || Date.parse(row.expires_at) > now));
      if (coupon === "KITCONSERVACAO") {
        if (!found || found.percent_off != null || found.amount_off != null)
          return json({ error: "Cupom indisponível" }, 400);
        const { data: kit, error: kitError } = await admin.rpc("kit_conservation_preview", { _items: items });
        if (kitError || !kit || Number(kit.kits) < 1)
          return json({ error: "O cupom exige pelo menos 5 kg de filamentos MasterPrint" }, 400);
      } else {
        if (!found) return json({ error: "Cupom inválido" }, 400);
        discountCents = Math.min(subtotalCents,
          found.percent_off != null ? Math.round(subtotalCents * Number(found.percent_off) / 100) : cents(found.amount_off ?? 0));
      }
    }

    const shippingCents = pixShippingCents(subtotalCents, lines.some(line => line.category_slug === "impressoras"), rules);
    try {
      blackcatPixPayload({
        total: (subtotalCents - discountCents + shippingCents) / 100,
        shipping: shippingCents / 100,
        customer_name: String(customer.name ?? ""), customer_email: String(customer.email ?? ""),
        customer_phone: String(customer.phone ?? ""), customer_cpf: String(customer.cpf ?? ""),
        ship_street: String(customer.street ?? ""), ship_number: String(customer.number ?? ""),
        ship_complement: customer.complement ? String(customer.complement) : null,
        ship_district: String(customer.district ?? ""), ship_city: String(customer.city ?? ""),
        ship_state: String(customer.state ?? ""), ship_cep: String(customer.cep ?? ""),
      }, lines, "pre-validation", postbackUrl, rules);
    } catch (validationError) {
      const reason = validationError instanceof Error ? validationError.message : "Dados do pedido inválidos";
      logFailure("pre-validation", null, { reason });
      return json({ error: reason }, 400);
    }

    // ---- Phase 2: create the order (database computes the authoritative totals) ----
    const { data: orderId, error: orderError } = await userClient.rpc("place_order", {
      _items: items, _customer: customer, _coupon: "", _method: "pix"
    });
    if (orderError || !orderId) return json({ error: orderError?.message ?? "Falha ao criar pedido" }, 409);
    createdOrderId = orderId as string;

    // ---- Phase 3: rebuild the payload from the stored order ----
    const { data: order, error: orderReadError } = await admin.from("orders").select("*").eq("id", orderId).eq("user_id", user.id).single();
    // order_items.product_id has no FK constraint in the existing schema, so PostgREST
    // cannot reliably embed products(categories(slug)) from order_items. Read IDs first,
    // then resolve categories from products, where the category relationship is defined.
    const { data: dbLines, error: linesReadError } = await admin.from("order_items")
      .select("product_name,unit_price,quantity,product_id").eq("order_id", orderId);
    const amount = Math.round(Number(order?.total) * 100);
    let chargePayload: Record<string, unknown>;
    try {
      if (orderReadError || linesReadError)
        throw new Error("Falha ao consultar os dados do pedido");
      if (!order || !dbLines?.length || !Number.isSafeInteger(amount) || amount <= 0 ||
          dbLines.some(line => typeof line.product_id !== "string" || !line.product_id))
        throw new Error("Pedido requer revisão");
      const productIds = [...new Set(dbLines.map(line => line.product_id as string))];
      const { data: lineProducts, error: productsError } = await admin.from("products")
        .select("id,categories(slug)").in("id", productIds);
      if (productsError || !lineProducts || lineProducts.length !== productIds.length)
        throw new Error("Não foi possível confirmar as categorias dos produtos");
      const categoryByProductId = new Map(lineProducts.map(product => [product.id, product.categories?.slug ?? null]));
      chargePayload = blackcatPixPayload(
        order,
        dbLines.map(line => ({
          product_name: line.product_name,
          unit_price: line.unit_price,
          quantity: line.quantity,
          category_slug: categoryByProductId.get(line.product_id as string) ?? null,
        })),
        orderId, postbackUrl, rules,
      );
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
      charge = await createBlackcatPix(chargePayload);
    } catch {
      // Uncertain state: the gateway may have received the charge. Do NOT cancel — reconcile.
      logFailure("gateway-call", orderId);
      return json({ error: "Resposta do gateway requer conciliação", orderId }, 503);
    }
    if (!charge?.transactionId || !charge?.paymentData?.copyPaste) {
      logFailure("gateway-response", orderId);
      return json({ error: "Resposta do gateway requer conciliação", orderId }, 503);
    }

    // ---- Phase 5: ledger ----
    const { error: ledgerError } = await admin.from("pix_transactions").insert({
      order_id: orderId, transaction_id: charge.transactionId,
      amount_cents: amount, status: "pending",
      copy_paste: charge.paymentData.copyPaste,
      qr_code_base64: charge.paymentData.qrCodeBase64 ?? null
    });
    if (ledgerError) {
      // The charge exists at the gateway but the ledger row is missing: manual reconciliation.
      logFailure("ledger-insert", orderId, { transactionId: String(charge.transactionId).slice(0, 64) });
      return json({ error: "Cobrança requer conciliação manual", orderId }, 503);
    }
    return json({ orderId, copyPaste: charge.paymentData.copyPaste,
      qrCodeBase64: charge.paymentData.qrCodeBase64 ?? null, amountCents: amount });
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
