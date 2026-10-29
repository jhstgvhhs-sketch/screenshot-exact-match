import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  save: vi.fn(),
  fixed: 37.8,
  enabled: true,
  threshold: 600,
  fail: false,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { ShippingSettingsEditor } from "@/components/site/ShippingSettings";

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.fixed = 37.8;
  mocks.enabled = true;
  mocks.threshold = 600;
  mocks.fail = false;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  mocks.from.mockImplementation(() => {
    const query: any = {};
    query.select = () => query;
    query.eq = () => query;
    query.maybeSingle = async () => ({
      data: {
        id: "main",
        fixed_shipping_brl: mocks.fixed,
        free_pix_shipping_enabled: mocks.enabled,
        free_pix_shipping_threshold_brl: mocks.threshold,
      },
      error: mocks.fail ? new Error("Tabela não instalada") : null,
    });
    query.upsert = (values: unknown) => {
      mocks.save(values);
      return query;
    };
    query.single = async () => ({ data: { id: "main" }, error: null });
    return query;
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});

function show() {
  return render(
    <QueryClientProvider client={client}>
      <ShippingSettingsEditor />
    </QueryClientProvider>,
  );
}

describe("Admin shipping settings", () => {
  it("loads the current freight and offers a zero-fee test value without saving automatically", async () => {
    show();
    const fee = await screen.findByLabelText("Frete fixo (R$)");
    expect(fee).toHaveValue(37.8);
    fireEvent.click(screen.getByRole("button", { name: "Preparar frete zero para teste" }));
    expect(fee).toHaveValue(0);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Clique em Salvar configuração");
  });

  it("saves the freight only after the administrator confirms", async () => {
    show();
    const fee = await screen.findByLabelText("Frete fixo (R$)");
    fireEvent.change(fee, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração de frete" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      id: "main",
      fixed_shipping_brl: 0,
      free_pix_shipping_enabled: true,
      free_pix_shipping_threshold_brl: 600,
    })));
    expect(await screen.findByRole("status")).toHaveTextContent("Frete atualizado");
  });
});
