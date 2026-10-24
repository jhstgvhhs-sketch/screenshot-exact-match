import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const headers = {
  "Content-Type": "application/json", "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS", "Cache-Control": "public, max-age=60",
};
Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Unavailable");
    const admin = createClient(url, key, { auth: { persistSession: false } });
    // Public, anonymous activity only. Never select names, addresses, amounts or order IDs.
    const { data, error } = await admin.from("orders").select("created_at")
      .eq("payment_status", "pago").neq("status", "cancelado")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .lte("created_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(3);
    if (error) throw error;
    return new Response(JSON.stringify({ purchases: (data ?? []).map(row => ({ createdAt: row.created_at })) }), { headers });
  } catch {
    return new Response(JSON.stringify({ purchases: [] }), { status: 503, headers: { ...headers, "Cache-Control": "no-store" } });
  }
});
