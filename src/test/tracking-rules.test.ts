import { describe, it, expect } from "vitest";
import {
  brazilPhone,
  trackingUrl,
  trackingMessage,
  trackingWhatsApp,
  trackingEmail,
  type TrackingOrder,
} from "../../supabase/functions/_shared/tracking-rules";
export const exampleOrder: TrackingOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_name: "Cliente <teste>",
  customer_phone: "(71) 91234-5678",
  customer_email: "local@example.test",
  status: "shipped",
  tracking_carrier: "Transportadora & teste",
  tracking_code: "ABC123",
  tracking_url: "https://transportadora.example/rastrear?codigo=ABC123&origem=loja",
};
describe("Tracking validation and manual messaging", () => {
  it("normalizes Brazilian mobile and landline numbers from the registered order", () => {
    expect(brazilPhone("(71) 91234-5678")).toBe("5571912345678");
    expect(brazilPhone("+55 71 91234-5678")).toBe("5571912345678");
    expect(brazilPhone("(11) 3456-7890")).toBe("551134567890");
    expect(brazilPhone("(55) 91234-5678")).toBe("5555912345678");
  });
  it("rejects invalid DDDs, wrong lengths, non-Brazilian numbers and suffixes", () => {
    for (const phone of [
      "+1 212 555 1234",
      "(20) 91234-5678",
      "(71) 81234-5678",
      "123",
      "(71) 91234-5678 ramal 5",
      "(71) 91234-5678?text=outro",
    ])
      expect(brazilPhone(phone)).toBeNull();
  });
  it("accepts valid public HTTPS URLs and rejects scripts, credentials and malformed URLs", () => {
    expect(trackingUrl(" https://transportadora.example/rastreio ")).toBe(
      "https://transportadora.example/rastreio",
    );
    for (const url of [
      "http://transportadora.example",
      "javascript:alert(1)",
      "https://user:pass@transportadora.example",
      "https://localhost/a",
      "https://127.0.0.1/a",
      "https://transportadora.example/a b",
      "https://transportadora.example:8080/a",
      "https:\\evil.example",
    ])
      expect(() => trackingUrl(url)).toThrow();
  });
  it("builds the exact requested service message and only uses the saved phone", () => {
    const link = new URL(trackingWhatsApp(exampleOrder));
    expect(link.hostname).toBe("wa.me");
    expect(link.pathname).toBe("/5571912345678");
    expect(link.searchParams.get("text")).toBe(trackingMessage(exampleOrder));
    expect(trackingMessage(exampleOrder)).toContain("Transportadora & teste");
    expect(trackingMessage(exampleOrder)).toContain("ABC123");
    expect(trackingMessage(exampleOrder)).not.toContain("desconto");
  });
  it("does not claim shipment for preparation or delivered orders", () => {
    for (const status of ["processing", "pending", "delivered", "cancelado"])
      expect(() => trackingWhatsApp({ ...exampleOrder, status })).toThrow(/enviado/);
    expect(() => trackingWhatsApp({ ...exampleOrder, tracking_code: null })).toThrow(/Salve/);
  });
  it("escapes customer data in the email and uses an HTTPS tracking button", () => {
    const email = trackingEmail(exampleOrder);
    expect(email.html).toContain("Cliente &lt;teste&gt;");
    expect(email.html).toContain("Transportadora &amp; teste");
    expect(email.html).not.toContain("Cliente <teste>");
    expect(email.html).toContain("RASTREAR PEDIDO");
    expect(email.html).toContain("#ff6a00");
    expect(email.text).toContain("ABC123");
  });
});
