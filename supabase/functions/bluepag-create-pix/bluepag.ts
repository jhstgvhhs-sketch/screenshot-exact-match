const BASE = "https://api.bluepag.com.br/api";
const REQUEST_TIMEOUT_MS = 20_000;

export class BluePagApiError extends Error {
  constructor(
    readonly stage: "create-pix" | "get-payment",
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
  const value = result?.error_code ?? result?.code;
  if (typeof value === "string" && /^[a-zA-Z0-9_.-]{1,48}$/.test(value)) return value;
  if (typeof value === "number") return String(value);
  return null;
}

async function apiKey(): Promise<string> {
  const value = Deno.env.get("BLUEPAG_API_KEY");
  if (!value) throw new BluePagApiError("create-pix", 0, "api_key_missing", false);
  return value;
}

async function request(
  stage: "create-pix" | "get-payment",
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; result: Record<string, unknown> | null }> {
  const key = await apiKey();
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "auth-token": key,
        ...init.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new BluePagApiError(stage, 0, null, stage === "create-pix");
  }

  const result = await readResponse(response);
  if (!response.ok) {
    throw new BluePagApiError(
      stage,
      response.status,
      providerCode(result),
      stage === "create-pix" && (response.status >= 500 || response.status === 408 || response.status === 409 || response.status === 429),
    );
  }
  return { response, result };
}

export async function createBluePagPix(input: {
  amountCents: number;
  name: string;
  orderId: string;
  notificationUrl: string;
}) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new BluePagApiError("create-pix", 400, "invalid_amount", false);
  }
  const { response, result } = await request("create-pix", "/payments/process", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      amount: input.amountCents,
      method: "pix",
      installments: 1,
      notification_url: input.notificationUrl,
      order_id: input.orderId,
      notify_payer: false,
    }),
  });

  const data = result?.data as Record<string, unknown> | undefined;
  const pix = data?.pix as Record<string, unknown> | undefined;
  const paymentId = data?.id;
  const uuid = pix?.uuid;
  const pixCode = pix?.qrcode_data;

  if (!data || paymentId === undefined || paymentId === null ||
      typeof uuid !== "string" || !uuid.trim() ||
      typeof pixCode !== "string" || !pixCode.trim()) {
    throw new BluePagApiError("create-pix", response.status, providerCode(result), true);
  }
  return {
    transactionId: uuid,
    copyPaste: pixCode,
    providerPaymentId: String(paymentId),
  };
}

export async function getBluePagPayment(paymentId: string) {
  const { response, result } = await request("get-payment", `/payments/${encodeURIComponent(paymentId)}`);
  const data = result?.data as Record<string, unknown> | undefined;
  const pix = data?.pix as Record<string, unknown> | undefined;
  if (!data || !pix || String(data.id) !== paymentId) {
    throw new BluePagApiError("get-payment", response.status, providerCode(result), false);
  }
  return {
    uuid: String(pix.uuid),
    type: String(data.method_slug ?? ""),
    status: Number(data.status) === 40 ? "paid" :
      Number(data.status) === 60 || Number(data.status) === 30 ? "cancelled" : "pending",
    amount_gross: Number(pix.amount),
  };
}

export function shouldReconcileCreateFailure(error: unknown): boolean {
  return error instanceof BluePagApiError && error.stage === "create-pix" && error.ambiguous;
}
