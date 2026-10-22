// Blackcat integration adapter. Deploy only after reviewing the complete server-side order and webhook workflow.
// Required secret: BLACKCAT_API_KEY (never exposed to the browser).
const BASE = "https://api.blackcatoficial.com/api";
export async function createBlackcatPix(payload: Record<string, unknown>) {
  const key = Deno.env.get("BLACKCAT_API_KEY");
  if (!key) throw new Error("BLACKCAT_API_KEY não configurada");
  const response = await fetch(BASE + "/sales/create-sale", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error("Falha ao criar cobrança Blackcat");
  return result.data;
}
export async function consultBlackcatPix(transactionId: string) {
  const key = Deno.env.get("BLACKCAT_API_KEY");
  if (!key) throw new Error("BLACKCAT_API_KEY não configurada");
  const response = await fetch(BASE + "/sales/" + encodeURIComponent(transactionId) + "/status", {
    headers: { "X-API-Key": key },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error("Falha ao consultar transação Blackcat");
  return result.data;
}
