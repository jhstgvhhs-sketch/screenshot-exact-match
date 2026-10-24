import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from, rpc: m.rpc } }));
import { OrdersPage } from "@/components/admin/OrdersPage";
let client: QueryClient;
const order = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "local",
  customer_name: "Cliente de teste",
  customer_email: "local@example.test",
  customer_phone: "",
  created_at: "2026-10-24T12:00:00Z",
  total: 97.7,
  subtotal: 59.9,
  discount: 0,
  shipping: 37.8,
  status: "pending",
  payment_status: "pendente",
  payment_method: "pix",
  tracking_code: null,
  archived_at: null,
  ship_street: "Rua teste",
  ship_number: "1",
  ship_city: "Salvador",
  ship_state: "BA",
  ship_cep: "00000000",
  ship_district: "Teste",
  ship_complement: "",
  order_items: [
    {
      id: "item",
      product_name: "PLA",
      color: "Branco",
      sku: "TEST",
      quantity: 1,
      unit_price: 59.9,
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: { rows: [order], count: 1 }, error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  m.from.mockImplementation(() => {
    const q: any = {};
    for (const k of ["select", "order", "range", "is", "eq", "in", "not", "or"])
      q[k] = vi.fn(() => q);
    q.update = m.update.mockReturnValue(q);
    q.single = vi.fn(async () => ({ data: order, error: null }));
    q.then = (resolve: any) => resolve({ data: [order], count: 1, error: null });
    return q;
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});
const show = () =>
  render(
    <QueryClientProvider client={client}>
      <OrdersPage />
    </QueryClientProvider>,
  );
describe("Order management safety", () => {
  it("lists orders and opens full product, delivery and payment details", async () => {
    show();
    expect(await screen.findByText("Cliente de teste")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Detalhes" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("PLA")).toBeInTheDocument();
    expect(screen.getByText(/Frete:/)).toHaveTextContent("37,80");
  });
  it("changing filters does not update any order or payment", async () => {
    show();
    await screen.findByText("Cliente de teste");
    fireEvent.change(screen.getByLabelText("Filtrar pedidos"), { target: { value: "paid" } });
    expect(m.update).not.toHaveBeenCalled();
    expect(m.rpc.mock.calls.every((call) => call[0] === "admin_order_page")).toBe(true);
  });
  it("saving delivery progress never sends payment_status", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Detalhes" }));
    fireEvent.change(await screen.findByLabelText("Andamento"), { target: { value: "shipped" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar andamento" }));
    await waitFor(() =>
      expect(m.update).toHaveBeenCalledWith({ status: "shipped", tracking_code: null }),
    );
    expect(m.update.mock.calls[0][0]).not.toHaveProperty("payment_status");
  });
  it("does not mark a payment paid when confirmation is declined", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Detalhes" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar pagamento recebido" }));
    expect(m.update).not.toHaveBeenCalled();
  });
});
