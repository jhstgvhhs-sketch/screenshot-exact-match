import { afterEach, describe, expect, it, vi } from "vitest";
import { cardWhatsAppUrl } from "@/lib/checkout";
import { SHIPPING_FLAT } from "@/lib/store";
import { FIXED_SHIPPING_BRL } from "@/lib/shipping";

afterEach(() => vi.unstubAllEnvs());

describe("Prepared checkout", () => {
  it("keeps shipping consistent at R$ 37,80", () => {
    expect(SHIPPING_FLAT).toBe(37.8);
    expect(FIXED_SHIPPING_BRL).toBe(SHIPPING_FLAT);
  });

  it.each(["", "invalid", "5511"])("blocks WhatsApp with an unconfigured or invalid contact: %s", number => {
    vi.stubEnv("VITE_CHECKOUT_WHATSAPP_NUMBER", number);
    expect(cardWhatsAppUrl()).toBeNull();
  });

  it("encodes the order and delivery details for the configured contact", () => {
    vi.stubEnv("VITE_CHECKOUT_WHATSAPP_NUMBER", "55 (11) 99999-9999");
    const data = new FormData();
    data.set("name", "João & Maria");
    data.set("street", "Rua A");
    const url = new URL(cardWhatsAppUrl([{
      variantId: "pla-black", productSlug: "pla", name: "PLA", color: "Preto", price: 59.9, quantity: 2,
    }], 119.8, data)!);
    expect(url.pathname).toBe("/5511999999999");
    expect(url.searchParams.get("text")).toContain("João & Maria");
    expect(url.searchParams.get("text")).toContain("157,60");
    expect(url.searchParams.get("text")).toContain("PLA — Preto × 2");
  });
});
