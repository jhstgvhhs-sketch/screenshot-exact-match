import { trackingReady, trackingEmail, type TrackingOrder } from "./tracking-rules.ts";
export type EmailConfig = { enabled: boolean; apiKey: string; from: string };
export type EmailResult = {
  state: "accepted" | "failed" | "uncertain";
  code: string;
  http?: number;
  providerId?: string;
};
export function emailConfigured(config: EmailConfig) {
  return config.enabled && !!config.apiKey && /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(config.from);
}
export async function sendTrackingEmail(
  order: TrackingOrder,
  notificationId: string,
  config: EmailConfig,
  fetcher: typeof fetch = fetch,
): Promise<EmailResult> {
  trackingReady(order);
  if (!emailConfigured(config)) return { state: "failed", code: "email_configuration_missing" };
  const headers = { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" };
  try {
    const domains = await fetcher("https://api.resend.com/domains?limit=100", {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!domains.ok)
      return { state: "failed", code: "sender_verification_failed", http: domains.status };
    const data = await domains.json();
    const domain = config.from.split("@")[1].toLowerCase();
    if (
      !data.data?.some(
        (d: { name: string; status: string }) =>
          d.name.toLowerCase() === domain && d.status === "verified",
      )
    )
      return { state: "failed", code: "sender_domain_not_verified" };
  } catch {
    return { state: "failed", code: "sender_verification_unavailable" };
  }
  try {
    const email = trackingEmail(order);
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": `3dflex-tracking/${notificationId}` },
      body: JSON.stringify({ from: config.from, to: [order.customer_email.trim()], ...email }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return {
        state:
          response.status >= 500 || response.status === 409 || response.status === 408
            ? "uncertain"
            : "failed",
        code:
          response.status === 429
            ? "rate_limited"
            : response.status >= 500 || response.status === 409 || response.status === 408
              ? "provider_outcome_unknown"
              : "provider_rejected",
        http: response.status,
      };
    const result = await response.json();
    return typeof result.id === "string" && result.id.length < 200
      ? {
          state: "accepted",
          code: "provider_accepted_not_delivery_confirmed",
          http: response.status,
          providerId: result.id,
        }
      : { state: "uncertain", code: "unrecognized_provider_response", http: response.status };
  } catch {
    return { state: "uncertain", code: "network_outcome_unknown_manual_review" };
  }
}
