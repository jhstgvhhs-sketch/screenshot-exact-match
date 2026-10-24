import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecentPurchases } from "../components/site/RecentPurchases";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), pathname: "/" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => mocks.pathname }));
beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); mocks.pathname = "/"; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("Real purchase notifications", () => {
  it("shows nothing when there are no confirmed purchases", async () => {
    mocks.invoke.mockResolvedValue({ data: { purchases: [] } });
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("displays a real event once per session and allows dismissing notifications", async () => {
    mocks.invoke.mockResolvedValue({ data: { purchases: [{ createdAt: new Date(Date.now() - 120000).toISOString() }] } });
    const { unmount } = render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByText("Compra confirmada na 3DFLEX")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Fechar notificações de compras"));
    expect(screen.queryByRole("status")).toBeNull();
    unmount(); render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(70000); });
    expect(screen.queryByRole("status")).toBeNull();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it("does not fetch or show notifications in checkout", async () => {
    mocks.pathname = "/checkout";
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(70000); });
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("ignores stale, future and malformed timestamps", async () => {
    mocks.invoke.mockResolvedValue({ data: { purchases: [{ createdAt: "invalid" }, { createdAt: new Date(Date.now() + 600000).toISOString() }, { createdAt: new Date(Date.now() - 172800000).toISOString() }] } });
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
