import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createBlackcatPix } from "../_shared/blackcat.ts";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

Deno.serve(async (request) => {
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
  void createBlackcatPix;
  void serviceKey;
  return json({ error: "Integração Pix ainda não liberada para cobranças reais." }, 503);
});
