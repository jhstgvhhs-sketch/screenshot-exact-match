import { describe, expect, it, vi, afterEach } from "vitest";
import { hasPrinter, shippingForOrder } from "@/lib/shipping";
import { cardWhatsAppUrl } from "@/lib/checkout";
const printer = {
  variantId: "p",
  productSlug: "modelo",
  name: "Modelo cadastrado",
  color: "Padrão",
  categorySlug: "impressoras",
  quantity: 1,
  price: 500,
};
afterEach(() => vi.unstubAllEnvs());
describe("Printer shipping", () => {
  it.each(["pix", "card", "cartao"] as const)(
    "waives freight for printers with %s, regardless of value",
    (method) => {
      expect(shippingForOrder(500, method, [printer])).toBe(0);
      expect(shippingForOrder(1, method, [printer, { categorySlug: "filamentos" }])).toBe(0);
    },
  );
  it("uses the registered category, never the product title or slug", () => {
    expect(hasPrinter([{ ...printer, categorySlug: "acessorios" }])).toBe(false);
    expect(shippingForOrder(500, "card", [{ categorySlug: "acessorios" }])).toBe(37.8);
    expect(shippingForOrder(600, "pix")).toBe(37.8);
    expect(shippingForOrder(600.01, "pix")).toBe(0);
    expect(shippingForOrder(1000, "card")).toBe(37.8);
  });
  it("includes zero freight, correct total and printer installment terms in the assisted card message", () => {
    vi.stubEnv("VITE_CHECKOUT_WHATSAPP_NUMBER", "11999999999");
    const message = new URL(cardWhatsAppUrl([printer], 500)!).searchParams.get("text")!;
    expect(message).toContain("Frete: Grátis");
    expect(message).toMatch(/Total: R\$\s500,00/);
    expect(message).toContain("Condição de cartão: compra com impressora, até 10x sem juros (consulte a loja).");
    expect(message).not.toContain("537,80");
  });
  it("keeps machine-interest terms for orders without printers", () => {
    vi.stubEnv("VITE_CHECKOUT_WHATSAPP_NUMBER", "11999999999");
    const filament = { ...printer, categorySlug: "filamentos", name: "PLA", price: 59.9 };
    const message = new URL(cardWhatsAppUrl([filament], 59.9)!).searchParams.get("text")!;
    expect(message).toContain("Condição de cartão: parcelamento sujeito aos juros da maquineta; confirme o valor com a loja.");
    expect(message).not.toContain("até 10x sem juros");
  });


});
