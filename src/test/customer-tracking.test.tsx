import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  eq: vi.fn(),
  rows: [] as any[],
  fail: false,
  missingNew: false,
  whatsapp: "71999999999",
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/site/StoreSettings", () => ({
  useStoreSettings: () => ({ data: { whatsapp: m.whatsapp }, isPending: false, isError: false }),
}));
import { CustomerOrders } from "@/components/CustomerOrders";
let client: QueryClient;
const order = {
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-10-24T12:00:00Z",
  status: "shipped",
  payment_status: "pago",
  total: 97.7,
  tracking_carrier: "Transportadora teste",
  tracking_code: "ABC123",
  tracking_url: "https://transportadora.example/track",
  ship_city: "Salvador",
  ship_state: "BA",
};
beforeEach(() => {
  vi.clearAllMocks();
  m.rows = [order];
  m.whatsapp = "71999999999";
  m.fail = false;
  m.missingNew = false;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  m.from.mockImplementation(() => {
    const q: any = {};
    let newFields = false;
    q.select = (fields: string) => {
      newFields = fields.includes("tracking_carrier");
      return q;
    };
    for (const key of ["order", "range"]) q[key] = () => q;
    q.eq = (...args: any[]) => {
      m.eq(...args);
      return q;
    };
    q.then = (resolve: any) =>
      resolve({
        data: m.rows,
        error: m.fail
          ? new Error("offline")
          : m.missingNew && newFields
            ? { code: "42703", message: "column orders.tracking_carrier does not exist" }
            : null,
        count: m.rows.length,
      });
    return q;
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});
const show = () =>
  render(
    <QueryClientProvider client={client}>
      <CustomerOrders userId="current-customer" />
    </QueryClientProvider>,
  );
describe("Customer tracking", () => {
  it("preserves order history when the additive tracking columns are not migrated yet", async () => {
    m.missingNew = true;
    show();
    expect(await screen.findByText("Nota fiscal e rastreamento")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      m.eq.mock.calls.every((call) => call[0] !== "user_id" || call[1] === "current-customer"),
    ).toBe(true);
  });
  it("keeps customer ownership and prepares the request using the store WhatsApp", async () => {
    show();
    const link = await screen.findByRole("link", {
      name: "Solicitar nota e rastreio pelo WhatsApp",
    });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://wa.me/5571999999999");
    expect(url.searchParams.get("text")).toContain("pedido #11111111");
    expect(url.searchParams.get("text")).toContain("comprovante de pagamento");
    expect(m.eq).toHaveBeenCalledWith("user_id", "current-customer");
    expect(screen.queryByText("Código de rastreamento: ABC123")).not.toBeInTheDocument();
  });
  it("offers the WhatsApp request even before tracking is registered", async () => {
    m.rows = [{ ...order, tracking_carrier: null, tracking_code: null, tracking_url: null }];
    show();
    expect(
      await screen.findByRole("link", { name: "Solicitar nota e rastreio pelo WhatsApp" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Abrir o WhatsApp não envia/)).toBeInTheDocument();
  });
  it("does not generate a link to an unconfigured or invalid store number", async () => {
    m.whatsapp = "invalid";
    show();
    expect(
      await screen.findByText(/WhatsApp de atendimento ainda não está disponível/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Solicitar nota/ })).not.toBeInTheDocument();
  });
  it("does not request a receipt for a cancelled order", async () => {
    m.rows = [{ ...order, status: "cancelado" }];
    show();
    expect(await screen.findByText("Pedido cancelado.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Solicitar nota/ })).not.toBeInTheDocument();
  });
  it("provides retry on query failure instead of showing an empty history", async () => {
    m.fail = true;
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(
      screen.queryByText("Você ainda não tem pedidos registrados nesta conta."),
    ).not.toBeInTheDocument();
  });
});
