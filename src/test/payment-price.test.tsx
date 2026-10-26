import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentPrice } from "@/components/site/PaymentPrice";
const config = vi.hoisted(() => ({ whatsapp: "" }));
vi.mock("@/components/site/StoreSettings", () => ({ useStoreSettings: () => ({ data: config }) }));
afterEach(() => {
  cleanup();
  config.whatsapp = "";
});
describe("Pix display and card simulation", () => {
  it("uses the configured destination and actual product price without fixed installments", () => {
    // Reserved test fixture only; the link is never opened or sent.
    config.whatsapp = "11999999999";
    render(<PaymentPrice price={3800} productName="Impressora de teste" prominent />);
    const link = screen.getByRole("link", { name: "Simular no WhatsApp" });
    const url = new URL(link.getAttribute("href")!);
    expect(url.pathname).toBe("/5511999999999");
    expect(url.searchParams.get("text")).toContain("Impressora de teste");
    expect(url.searchParams.get("text")).toMatch(/3.800,00/);
    expect(url.searchParams.get("text")).toContain("juros da maquineta");
    expect(screen.queryByText(/sem juros/i)).not.toBeInTheDocument();
  });
  it("links to contact instead of inventing a WhatsApp number", () => {
    render(<PaymentPrice price={59.9} productName="Filamento" prominent />);
    expect(screen.queryByRole("link", { name: "Simular no WhatsApp" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consultar atendimento" })).toHaveAttribute(
      "href",
      "/info/contato",
    );
  });
});
