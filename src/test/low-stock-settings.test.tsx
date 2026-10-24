import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), limit: 3 }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));
import { LowStockSettings } from "@/components/admin/LowStockSettings";
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  m.limit = 3;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  m.from.mockImplementation((table: string) => {
    const q: any = {};
    q.select = () => q;
    q.eq = () => q;
    q.update = (v: { low_stock_limit: number }) => {
      m.update(table, v);
      m.limit = v.low_stock_limit;
      return q;
    };
    q.single = async () => ({ data: { low_stock_limit: m.limit }, error: null });
    return q;
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});
describe("Shared low stock setting", () => {
  it("saves only the shared preference and never touches product variants", async () => {
    render(
      <QueryClientProvider client={client}>
        <LowStockSettings />
      </QueryClientProvider>,
    );
    const input = await screen.findByLabelText("Limite compartilhado de estoque baixo");
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar limite" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "quantidades em estoque não foram alteradas",
    );
    expect(m.update).toHaveBeenCalledWith("admin_preferences", { low_stock_limit: 5 });
    expect(m.from.mock.calls.every((call) => call[0] === "admin_preferences")).toBe(true);
  });
});
