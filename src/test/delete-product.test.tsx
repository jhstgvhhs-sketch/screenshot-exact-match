import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: m.rpc } }));
const saved = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  m.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const show = () =>
  render(<DeleteProductButton product={{ id: "p1", name: "Filamento PLA" }} onDeleted={saved} />);
describe("Delete product button", () => {
  it("requires confirmation and sends only the selected product id", async () => {
    show();
    fireEvent.click(screen.getByRole("button"));
    await vi.waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("todas as suas cores"));
    expect(m.rpc).toHaveBeenCalledWith("admin_delete_unused_product", { p_product: "p1" });
  });
  it("does not delete when cancelled", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    show();
    fireEvent.click(screen.getByRole("button"));
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("shows history protection errors without pretending to succeed", async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "Este produto possui pedidos vinculados. Use Desativar produto.",
      },
    });
    show();
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("pedidos vinculados");
    expect(saved).not.toHaveBeenCalled();
  });
  it("does not accept an unconfirmed deletion", async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    show();
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("não confirmou");
    expect(saved).not.toHaveBeenCalled();
  });
});
