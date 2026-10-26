// Read/presentation only. This module never authorizes or writes a payment.
export type PaymentState =
  "paid" | "pending" | "cancelled" | "expired" | "refunded" | "failed" | "unknown";
export function paymentState(value: unknown): PaymentState {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  const aliases: Record<string, PaymentState> = {
    paid: "paid",
    pago: "paid",
    pending: "pending",
    pendente: "pending",
    cancelled: "cancelled",
    canceled: "cancelled",
    cancelado: "cancelled",
    expired: "expired",
    expirado: "expired",
    refunded: "refunded",
    estornado: "refunded",
    failed: "failed",
    falhou: "failed",
  };
  return aliases[status] ?? "unknown";
}
export function paymentLabel(value: unknown): string {
  return {
    paid: "Pagamento confirmado",
    pending: "Pagamento pendente",
    cancelled: "Pagamento cancelado",
    expired: "Pagamento expirado",
    refunded: "Pagamento estornado",
    failed: "Pagamento não aprovado",
    unknown: "Pagamento em verificação",
  }[paymentState(value)];
}
export function pixDisplayState(
  payment: unknown,
  order: unknown,
): "paid" | "pending" | "closed" | "unavailable" {
  const status = paymentState(payment);
  if (
    ["cancelled", "cancelado"].includes(String(order).toLowerCase()) ||
    ["cancelled", "expired", "refunded", "failed"].includes(status)
  )
    return "closed";
  return status === "paid" ? "paid" : status === "pending" ? "pending" : "unavailable";
}
