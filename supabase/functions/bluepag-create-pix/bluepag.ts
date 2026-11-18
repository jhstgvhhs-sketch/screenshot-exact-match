const BASE = "https://api.bluepag.com.br/api/v1";
const REQUEST_TIMEOUT_MS = 20_000;
let cachedToken: { value: string; expiresAt: number } | null = null;

export class BluePagApiError extends Error {
  constructor(
    readonly stage: "oauth" | "create-pix" | "get-payment",
    readonly httpStatus: number,
    readonly providerCode: string | null,
    readonly ambiguous: boolean,
  ) {
    super(`bluepag-${stage}-http-${httpStatus}${providerCode ? `-code-${providerCode}` : ""}`);
    this.name = "BluePagApiError";
  }
}

async function readResponse(response: Response): Promise<Record<string, unknown> | null> {
  const value = await response.json().catch(() => null);
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function providerCode(result: Record<string, unknown> | null): string | null {
  const nested = result?.data && typeof result.data === "object"
    ? result.data as Record<string, unknown> : null;
  const value = result?.error_code ?? result?.code ?? nested?.code;
  if (typeof value === "string" && /^[a-zA-Z0-9_.-]{1,48}$/.test(value)) return value;
  if (typeof value === "number") return String(value);
  return null;
}

function isAmbiguousCreateFailure(status: number): boolean {
  // A timeout/conflict/server error may happen after the provider accepted the charge.
  return status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function providerFetch(
  stage: "oauth" | "create-pix" | "get-payment",
  url: string,
  init: RequestInit,
): Promise<{ response: Response; result: Record<string, unknown> | null }> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new BluePagApiError(stage, 0, null, stage === "create-pix");
  }
  const result = await readResponse(response);
  if (!response.ok) {
    throw new BluePagApiError(stage, response.status, providerCode(result),
      stage === "create-pix" && isAmbiguousCreateFailure(response.status));
  }
  return { response, result };
}

async function accessToken(): Promise<string> {
  const clientId = Deno.env.get("BLUEPAG_CLIENT_ID");
  const clientSecret = Deno.env.get("BLUEPAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new BluePagApiError("oauth", 0, "credentials_missing", false);
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const basic = btoa(`${clientId}:${clientSecret}`);
  const { result } = await providerFetch("oauth", `${BASE}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", authorization: `Basic ${basic}`, "content-type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });
  if (typeof result?.access_token !== "string" || !result.access_token) {
    throw new BluePagApiError("oauth", 200, providerCode(result), false);
  }
  const expiresIn = Number(result.expires_in ?? 3600);
  cachedToken = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  };
  return cachedToken.value;
}

export async function createBluePagPix(input: {
  amount: number; payer_name: string; payer_email: string; payer_cpf: string;
  description: string; postback_url: string;
}) {
  const token = await accessToken();
  const { response, result } = await providerFetch("create-pix", `${BASE}/payments/pix`, {
    method: "POST",
    headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = result?.data as Record<string, unknown> | undefined;
  if (result?.success !== true ||
      typeof data?.transaction_uuid !== "string" || !data.transaction_uuid.trim() ||
      typeof data?.pix_code !== "string" || !data.pix_code.trim()) {
    // A 2xx response without a usable charge identifier is not safe to retry.
    throw new BluePagApiError("create-pix", response.status, providerCode(result), true);
  }
  return { transactionId: data.transaction_uuid, copyPaste: data.pix_code };
}

export async function getBluePagPayment(uuid: string) {
  const token = await accessToken();
  const { response, result } = await providerFetch("get-payment", `${BASE}/payments/${encodeURIComponent(uuid)}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  const data = result?.data as Record<string, unknown> | undefined;
  if (result?.success !== true || data?.uuid !== uuid) {
    throw new BluePagApiError("get-payment", response.status, providerCode(result), false);
  }
  return data as { uuid: string; type: string; status: string; amount_gross: number; amount?: number };
}

export function shouldReconcileCreateFailure(error: unknown): boolean {
  return error instanceof BluePagApiError && error.stage === "create-pix" && error.ambiguous;
}
