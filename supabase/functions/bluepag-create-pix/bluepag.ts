const BASE = "https://api.bluepag.com.br/api/v1";
let cachedToken: { value: string; expiresAt: number } | null = null;

class BluePagApiError extends Error {
  constructor(readonly stage: string, readonly httpStatus: number, readonly providerCode: string | null) {
    super(`bluepag-${stage}-http-${httpStatus}${providerCode ? `-code-${providerCode}` : ""}`);
    this.name = "BluePagApiError";
  }
}

async function readResponse(response: Response): Promise<Record<string, unknown> | null> {
  const value = await response.json().catch(() => null);
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function providerCode(result: Record<string, unknown> | null): string | null {
  const data = result?.error ?? result?.code ?? (result?.data as Record<string, unknown> | undefined)?.code;
  if (typeof data === "string" && /^[a-zA-Z0-9_.-]{1,48}$/.test(data)) return data;
  if (typeof data === "number") return String(data);
  return null;
}

async function accessToken(): Promise<string> {
  const clientId = Deno.env.get("BLUEPAG_CLIENT_ID");
  const clientSecret = Deno.env.get("BLUEPAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("bluepag-credentials-missing");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const basic = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", authorization: `Basic ${basic}`, "content-type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });
  const result = await readResponse(response);
  if (!response.ok || typeof result?.access_token !== "string") {
    throw new BluePagApiError("oauth", response.status, providerCode(result));
  }
  cachedToken = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(60, Number(result.expires_in ?? 3600)) * 1000,
  };
  return cachedToken.value;
}

export async function createBluePagPix(input: {
  amount: number; payer_name: string; payer_email: string; payer_cpf: string;
  description: string; postback_url: string;
}) {
  const token = await accessToken();
  const response = await fetch(`${BASE}/payments/pix`, {
    method: "POST",
    headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await readResponse(response);
  const data = result?.data as Record<string, unknown> | undefined;
  if (!response.ok || result?.success !== true ||
      typeof data?.transaction_uuid !== "string" ||
      typeof data?.pix_code !== "string" || !data.pix_code.trim()) {
    throw new BluePagApiError("create-pix", response.status, providerCode(result));
  }
  return { transactionId: data.transaction_uuid, copyPaste: data.pix_code };
}

export async function getBluePagPayment(uuid: string) {
  const token = await accessToken();
  const response = await fetch(`${BASE}/payments/${encodeURIComponent(uuid)}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  const result = await readResponse(response);
  const data = result?.data as Record<string, unknown> | undefined;
  if (!response.ok || result?.success !== true || data?.uuid !== uuid) {
    throw new BluePagApiError("get-payment", response.status, providerCode(result));
  }
  return data as { uuid: string; type: string; status: string; amount_gross: number; amount?: number };
}
