import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { recentPaidPurchases } from "../_shared/purchase-feed.ts";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Unavailable");
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const purchases = await recentPaidPurchases(admin);
    return new Response(JSON.stringify({ purchases }), { headers });
  } catch {
    return new Response(JSON.stringify({ purchases: [] }), {
      status: 503,
      headers: { ...headers, "Cache-Control": "no-store" },
    });
  }
});
