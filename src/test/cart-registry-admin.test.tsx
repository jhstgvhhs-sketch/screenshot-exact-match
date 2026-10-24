import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartRegistry } from "@/components/admin/CartRegistry";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
const cart = {
  id: "cart-1",
  customer_name: "Cliente local",
  email: "local@example.test",
  phone: "5571999999999",
  items: [{ name: "PLA", color: "Preto", quantity: 2, price: 59.9 }],
  estimated_value: 119.8,
  status: "abandoned",
  last_activity_at: "2026-10-24T15:00:00Z",
  expires_at: "2026-10-31T15:00:00Z",
  email_consent: false,
  whatsapp_consent: false,
  linked_order_id: null,
};
const result = {
  carts: [cart],
  count: 1,
  metrics: { abandoned: 1, potential: 119.8, recovered: 0, revenue: 0 },
};
const clients: QueryClient[] = [];
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <CartRegistry />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  vi.clearAllMocks();
});
describe("Cart registry administration", () => {
  it("loads records without messaging functions, filters on server and opens details", async () => {
    mocks.rpc.mockResolvedValue({ data: result, error: null });
    show();
    await screen.findByText("Cliente local");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_cart_registry", { p_page: 0, p_status: "all" });
    fireEvent.click(screen.getByText("Ver detalhes"));
    expect(screen.getByText(/Identificador: cart-1/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status do carrinho"), {
      target: { value: "abandoned" },
    });
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenLastCalledWith("admin_cart_registry", {
        p_page: 0,
        p_status: "abandoned",
      }),
    );
  });
  it("shows an empty list without promising unavailable automation", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...result, carts: [], count: 0 }, error: null });
    show();
    expect(await screen.findByText(/Nenhum carrinho neste filtro/)).toBeInTheDocument();
    expect(
      screen.getByText(/Envios automáticos de mensagens não estão ativados/),
    ).toBeInTheDocument();
  });
  it("shows query failures and allows retry without presenting false zero metrics", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("Forbidden") });
    show();
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(
      /Não foi possível consultar/,
    );
    expect(screen.queryByText("Valor potencial (sem frete)")).toBeNull();
    mocks.rpc.mockResolvedValue({ data: result, error: null });
    fireEvent.click(screen.getByText("Consultar novamente"));
    expect(await screen.findByText("Cliente local")).toBeInTheDocument();
  });
});
