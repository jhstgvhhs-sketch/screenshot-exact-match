import { describe, expect, it } from "vitest";
import { paymentLabel, paymentState, pixDisplayState } from "@/lib/payment-status";
describe("Payment presentation compatibility", () => {
  it.each([
    ["paid", "pago", "Pagamento confirmado"],
    ["pending", "pendente", "Pagamento pendente"],
    ["cancelled", "cancelado", "Pagamento cancelado"],
    ["expired", "expirado", "Pagamento expirado"],
    ["refunded", "estornado", "Pagamento estornado"],
  ])("normalizes %s and %s only for display", (english, portuguese, label) => {
    expect(paymentState(english)).toBe(paymentState(portuguese));
    expect(paymentLabel(english)).toBe(label);
    expect(paymentLabel(portuguese)).toBe(label);
  });
  it("fails closed for unknown gateway-like values and cancelled orders", () => {
    expect(pixDisplayState("APPROVED", "processing")).toBe("unavailable");
    expect(pixDisplayState("paid", "cancelled")).toBe("closed");
    expect(pixDisplayState("paid", "processing")).toBe("paid");
    expect(pixDisplayState("pending", "pending")).toBe("pending");
    for (const status of ["expired", "expirado", "cancelled", "cancelado", "refunded", "estornado"])
      expect(pixDisplayState(status, "pending")).toBe("closed");
    expect(paymentLabel(null)).toBe("Pagamento em verificação");
  });
});
