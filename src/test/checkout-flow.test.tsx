import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkout } from "../routes/checkout";

const cart = vi.hoisted(() => ({ subtotal: 59.9, items: [{ variantId: "v1", name: "PLA", color: "Branco", quantity: 1, price: 59.9 }] }));
vi.mock("@/lib/cart", () => ({ useCart: () => cart }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => () => ({}), Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={to} {...props}>{children}</a> }));
afterEach(cleanup);

describe("Checkout review and navigation", () => {
  it("shows products, freight and total before payment and preserves fields when going back", () => {
    cart.subtotal = 59.9;
    render(<Checkout/>);
    expect(screen.getByText("Resumo do pedido")).toBeInTheDocument();
    expect(screen.getByText(/PLA — Branco/)).toBeInTheDocument();
    expect(screen.getByText(/97,70/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao carrinho" })).toHaveAttribute("href", "/carrinho");
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Cliente teste" } });
    fireEvent.submit(document.getElementById("checkout-form")!);
    expect(screen.getByRole("heading", { name: "Pagamento" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Etapas da compra" }).querySelector('[aria-current="step"]')).toHaveTextContent("Pagamento");
    fireEvent.click(screen.getByRole("button", { name: "Voltar aos dados de entrega" }));
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Cliente teste");
  });

  it("shows free Pix shipping and restores fixed freight when card is selected", () => {
    cart.subtotal = 650;
    render(<Checkout/>);
    expect(screen.getByText("Frete grátis no Pix")).toBeInTheDocument();
    fireEvent.submit(document.getElementById("checkout-form")!);
    fireEvent.click(screen.getByRole("radio", { name: /Cartão de crédito/ }));
    expect(screen.getByText("Frete fixo")).toBeInTheDocument();
    expect(screen.getByText(/687,80/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar com cartão" })).toBeDisabled();
  });
});
