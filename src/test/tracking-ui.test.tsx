import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: m.rpc, functions: { invoke: m.invoke } },
}));
import { OrderTracking } from "@/components/admin/OrderTracking";
const order = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_name: "Cliente local",
  customer_phone: "71912345678",
  customer_email: "local@example.test",
  status: "shipped",
  tracking_carrier: "Transportadora teste",
  tracking_code: "ABC123",
  tracking_url: "https://transportadora.example/rastreio",
};
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.invoke.mockImplementation(async (_name, options) => ({
    data:
      options.body.mode === "status"
        ? { configured: false, history: [], attempts: [] }
        : { state: "accepted", message: "E-mail aceito pelo Resend. Entrega não confirmada." },
    error: null,
  }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});
const show = (data = order) =>
  render(
    <QueryClientProvider client={client}>
      <OrderTracking order={data} onSaved={() => {}} />
    </QueryClientProvider>,
  );
describe("Saved tracking actions", () => {
  it("saves only tracking fields through the admin RPC", async () => {
    show();
    fireEvent.change(screen.getByLabelText("Transportadora"), {
      target: { value: "Outra transportadora" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rastreamento" }));
    await waitFor(() =>
      expect(m.rpc).toHaveBeenCalledWith("admin_save_tracking", {
        p_order: order.id,
        p_carrier: "Outra transportadora",
        p_code: "ABC123",
        p_url: order.tracking_url,
      }),
    );
    expect(m.rpc.mock.calls[0][1]).not.toHaveProperty("payment_status");
    expect(m.rpc.mock.calls[0][1]).not.toHaveProperty("status");
  });
  it("rejects non-HTTPS links before saving and blocks messages with unsaved edits", async () => {
    show();
    fireEvent.change(screen.getByLabelText("Link oficial de rastreamento"), {
      target: { value: "http://unsafe.example" },
    });
    expect(screen.getByRole("button", { name: "Enviar pelo WhatsApp" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar rastreamento" }));
    expect(await screen.findByRole("status")).toHaveTextContent("HTTPS");
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("opens a manual WhatsApp link without recording a message as sent", async () => {
    show();
    const link = screen.getByRole("link", { name: "Enviar pelo WhatsApp" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("href")).toContain("https://wa.me/5571912345678?text=");
    fireEvent.click(link);
    expect(await screen.findByRole("status")).toHaveTextContent("não registra mensagem enviada");
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.invoke.mock.calls.every((call) => call[1].body.mode === "status")).toBe(true);
  });
  it("does not display successful delivery when email is unconfigured", async () => {
    show();
    expect(await screen.findByText(/E-mail pendente de configuração/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notificar por e-mail" })).toBeDisabled();
    expect(screen.queryByText(/E-mail aceito pelo Resend/)).not.toBeInTheDocument();
  });
  it("sends only the order ID and blocks repeated clicks during a pending email request", async () => {
    let finish: (data: any) => void = () => {};
    m.invoke.mockImplementation(async (_name, options) =>
      options.body.mode === "status"
        ? { data: { configured: true, history: [], attempts: [] }, error: null }
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    show();
    await screen.findByText(/Credenciais presentes/);
    const button = screen.getByRole("button", { name: "Notificar por e-mail" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() =>
      expect(m.invoke.mock.calls.filter((call) => call[1].body.mode === "send")).toHaveLength(1),
    );
    expect(m.invoke.mock.calls.find((call) => call[1].body.mode === "send")?.[1].body).toEqual({
      orderId: order.id,
      mode: "send",
    });
    finish({
      data: { state: "accepted", message: "Aceito pelo provedor — entrega não confirmada." },
      error: null,
    });
    expect(await screen.findByRole("status")).toHaveTextContent("entrega não confirmada");
  });
  it("requires shipped status instead of automatically changing it", () => {
    show({ ...order, status: "processing" });
    expect(screen.getByRole("button", { name: "Enviar pelo WhatsApp" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Notificar por e-mail" })).toBeDisabled();
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
