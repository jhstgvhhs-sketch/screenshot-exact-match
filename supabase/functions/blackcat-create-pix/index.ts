import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createBlackcatPix } from "../_shared/blackcat.ts";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" } });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  // Safety switch: never initiate a real charge before completing gateway and stock tests.
  if (Deno.env.get("BLACKCAT_PIX_ENABLED") !== "true")
    return json({ error: "Pix em preparação. Nenhuma cobrança foi criada." }, 503);

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
        typeof item.variant_id !== "string" || item.quantity !== 1) ||
      !customer || !/^[0-9]{11}$/.test(String(customer.cpf ?? ""))) {
    return json({ error: "Dados do pedido inválidos" }, 400);
  }
  const { data: orderId, error: orderError } = await userClient.rpc("place_order", {
    _items: items, _customer: customer, _coupon: "", _method: "pix"
  });
  if (orderError || !orderId) return json({ error: orderError?.message ?? "Falha ao criar pedido" }, 409);
  const { data: order } = await admin.from("orders").select("id,total,user_id").eq("id", orderId).eq("user_id", user.id).single();
  if (!order) return json({ error: "Pedido não encontrado", orderId }, 500);
  void createBlackcatPix;
  return json({ error: "Cobrança pendente de validação do gateway", orderId }, 503);
});
