import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoveOrderButton } from "@/components/admin/RemoveOrderButton";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
const clients: QueryClient[] = [];
function show(archived = false) {
  const client = new QueryClient();
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <RemoveOrderButton orderId="local-order" archived={archived} />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
describe("Remove order from list", () => {
  it("requires confirmation and calls only the existing admin archive operation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    show();
    fireEvent.click(screen.getByText("Apagar da lista"));
    await screen.findByText(/Pedido retirado da lista principal/);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Ele ficará arquivado"));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("archive_order_admin", {
      p_order_id: "local-order",
    });
  });
  it("does nothing when confirmation is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show();
    fireEvent.click(screen.getByText("Apagar da lista"));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not report success when the backend rejects the operation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    show();
    fireEvent.click(screen.getByText("Apagar da lista"));
    await screen.findByText("O banco não confirmou a remoção da lista.");
    expect(screen.queryByText(/Pedido retirado/)).toBeNull();
  });
  it("prevents repeat clicks during a request and disables already archived orders", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let finish!: (value: unknown) => void;
    mocks.rpc.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    show();
    fireEvent.click(screen.getByText("Apagar da lista"));
    expect(screen.getByText("Removendo…")).toBeDisabled();
    fireEvent.click(screen.getByText("Removendo…"));
    expect(mocks.rpc).toHaveBeenCalledOnce();
    finish({ data: true, error: null });
    await waitFor(() => expect(screen.getByText("Apagar da lista")).not.toBeDisabled());
    cleanup();
    show(true);
    expect(screen.getByText("Apagar da lista")).toBeDisabled();
  });
});
