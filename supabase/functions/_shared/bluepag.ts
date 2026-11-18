// Cliente compartilhado da BluePag API v1. Opera somente com PIX em BRL.
// O JWT OAuth2 é mantido em memória no runtime e renovado antes do vencimento.

const BASE_URL = "https://api.bluepag.com.br/api/v1";
const TIMEOUT_MS = 20_000;

type ApiStage = "auth" | "create-pix" | "get-payment";

export class BluePagApiError extends Error {
  constructor(
    readonly stage: ApiStage,
    readonly httpStatus: number,
    readonly providerCode: string | null,
    readonly ambiguous: boolean,
  ) {
    super(`bluepag-${stage}-http-${httpStatus}${providerCode ? `-code-${providerCode}` : ""}`);
    this.name = "BluePagApiError";
  }
}

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;
let tokenRequest: Promise<string> | null = null;

function providerCode(body: Record<string, unknown> | null): string | null {
  const value = body?.error_code ?? body?.code;
  if (typeof value === "string" && /^[a-zA-Z0-9_.-]{1,48}$/.test(value)) return value;
  return typeof value === "number" ? String(value) : null;
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const value = await response.json().catch(() => null);
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function requestToken(): Promise<string> {
  const clientId = Deno.env.get("BLUEPAG_CLIENT_ID");
  const clientSecret = Deno.env.get("BLUEPAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new BluePagApiError("auth", 0, "credentials_missing", false);
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Basic ${basic}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new BluePagApiError("auth", 0, null, false);
  }

  const body = await readJson(response);
  const data = body?.data && typeof body.data === "object"
    ? body.data as Record<string, unknown>
    : body;
  const token = data?.access_token;
  if (!response.ok || typeof token !== "string" || !token.trim()) {
    throw new BluePagApiError("auth", response.status, providerCode(body), false);
  }

  const expiry = Number(data?.expires_in ?? 3600);
  const lifetimeSeconds = Number.isFinite(expiry) ? Math.max(60, expiry) : 3600;
  cachedToken = {
    value: token,
    expiresAt: Date.now() + lifetimeSeconds * 1000 - 60_000,
  };
  return token;
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (!tokenRequest) {
    tokenRequest = requestToken().finally(() => { tokenRequest = null; });
  }
  return await tokenRequest;
}

async function apiRequest(
  stage: "create-pix" | "get-payment",
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Se a conexão cair durante a criação, a BluePag pode ter recebido a cobrança.
    throw new BluePagApiError(stage, 0, null, stage === "create-pix");
  }

  const body = await readJson(response);
  if (!response.ok || body?.success === false) {
    const ambiguous = stage === "create-pix" &&
      (response.status >= 500 || response.status === 408 ||
        response.status === 409 || response.status === 429);
    throw new BluePagApiError(stage, response.status, providerCode(body), ambiguous);
  }
  return body ?? {};
}

function responseData(body: Record<string, unknown>): Record<string, unknown> {
  const value = body.data;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : body;
}

export async function createBluePagPix(input: {
  amountCents: number;
  payerName: string;
  payerEmail: string;
  payerCpf: string;
  description: string;
  postbackUrl: string;
}): Promise<{ transactionId: string; copyPaste: string }> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new BluePagApiError("create-pix", 400, "invalid_amount", false);
  }

  const cpf = input.payerCpf.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || !input.payerName.trim() || !input.payerEmail.trim()) {
    throw new BluePagApiError("create-pix", 400, "invalid_payer", false);
  }

  const body = await apiRequest("create-pix", "/payments/pix", {
    method: "POST",
    body: JSON.stringify({
      amount: Number((input.amountCents / 100).toFixed(2)),
      payer_name: input.payerName.trim(),
      payer_email: input.payerEmail.trim(),
      payer_cpf: cpf,
      description: input.description,
      postback_url: input.postbackUrl,
    }),
  });

  const data = responseData(body);
  // A documentação/contrato do gateway usa transaction_uuid e pix_code.
  const transactionId = data.transaction_uuid ?? data.uuid;
  const copyPaste = data.pix_code ?? data.copy_paste;
  if (typeof transactionId !== "string" || !transactionId.trim() ||
      typeof copyPaste !== "string" || !copyPaste.trim()) {
    // A cobrança pode ter sido criada, mesmo com resposta incompleta.
    throw new BluePagApiError("create-pix", 200, "incomplete_provider_response", true);
  }
  return { transactionId, copyPaste };
}

export async function getBluePagPayment(uuid: string): Promise<{
  uuid: string;
  type: string;
  status: "paid" | "failed" | "pending";
  amountBRL: number | null;
}> {
  const body = await apiRequest(
    "get-payment",
    `/payments/${encodeURIComponent(uuid)}`,
    { method: "GET" },
  );
  const data = responseData(body);
  const returnedUuid = data.uuid ?? data.transaction_uuid;
  if (typeof returnedUuid !== "string" || returnedUuid !== uuid) {
    throw new BluePagApiError("get-payment", 200, "transaction_mismatch", false);
  }

  const rawStatus = String(data.status ?? "").toLowerCase();
  const status: "paid" | "failed" | "pending" =
    ["completed", "complete", "paid", "success", "succeeded"].includes(rawStatus)
      ? "paid"
      : ["failed", "failure", "cancelled", "canceled", "expired", "refused"].includes(rawStatus)
        ? "failed"
        : "pending";

  const rawAmount = data.amount_gross ?? data.amount;
  const amount = rawAmount === undefined || rawAmount === null ? NaN : Number(rawAmount);
  return {
    uuid: returnedUuid,
    type: String(data.type ?? data.method ?? "").toLowerCase(),
    status,
    amountBRL: Number.isFinite(amount) ? amount : null,
  };
}

export async function verifyBluePagWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = Deno.env.get("BLUEPAG_CLIENT_SECRET");
  if (!secret || !signatureHeader) return false;

  const supplied = signatureHeader.trim().replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)),
  );
  const expected = Array.from(
    digest,
    byte => byte.toString(16).padStart(2, "0"),
  ).join("");

  // Compara todos os caracteres, sem interromper no primeiro byte diferente.
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return difference === 0;
}

export function shouldReconcileCreateFailure(error: unknown): boolean {
  return error instanceof BluePagApiError &&
    error.stage === "create-pix" && error.ambiguous;
}
