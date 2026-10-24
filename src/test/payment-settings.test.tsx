import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ from: vi.fn(), save: vi.fn(), missing: false, fail: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));
import { PaymentGatewaySettings } from "@/components/site/PaymentGatewaySettings";
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  m.missing = false;
  m.fail = false;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  m.from.mockImplementation(() => {
    const q: any = {};
    q.select = () => q;
    q.eq = () => q;
    q.maybeSingle = async () => ({
      data: m.missing
        ? null
        : { id: "main", provider: "blackcat", environment: "production", pix_enabled: true },
      error: null,
    });
    q.upsert = (values: any) => {
      m.save(values);
      return q;
    };
    q.single = async () => ({
      data: m.fail ? null : { id: "main" },
      error: m.fail ? new Error("Falha local de teste") : null,
    });
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
      <PaymentGatewaySettings />
    </QueryClientProvider>,
  );
describe("Gateway settings preservation", () => {
  it("loads the saved Blackcat configuration without writing any settings", async () => {
    show();
    expect(await screen.findByLabelText("Gateway")).toHaveValue("blackcat");
    expect(screen.getByLabelText("Ambiente")).toHaveValue("production");
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(m.save).not.toHaveBeenCalled();
  });
  it("does not silently replace a missing configuration with disabled sandbox values", async () => {
    m.missing = true;
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("não altera a integração");
    expect(screen.queryByLabelText("Gateway")).not.toBeInTheDocument();
    expect(m.save).not.toHaveBeenCalled();
  });
  it("saves metadata only and never claims to charge or change server credentials", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Salvar configurações de pagamento" }),
    );
    await waitFor(() =>
      expect(m.save).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "blackcat",
          environment: "production",
          pix_enabled: true,
        }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Nenhuma cobrança foi criada");
  });
  it("recovers controls after a save error", async () => {
    m.fail = true;
    show();
    const button = await screen.findByRole("button", { name: "Salvar configurações de pagamento" });
    fireEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent("Falha local de teste");
    expect(button).not.toBeDisabled();
  });
});
