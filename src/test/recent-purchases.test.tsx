import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecentPurchases } from "../components/site/RecentPurchases";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), pathname: "/", config: { enabled: true, title: "Compra realizada!", messages: [{ text: "Compra real de filamentos.", enabled: true }], display_seconds: 6, interval_seconds: 60 } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/purchase-notification-settings", () => ({ usePurchaseNotificationSettings: () => ({ data: mocks.config, isError: false }) }));
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => mocks.pathname }));
beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); mocks.pathname = "/"; mocks.config.enabled = true; mocks.config.display_seconds = 6; mocks.config.interval_seconds = 60; });
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
    expect(screen.getByText("Compra realizada!")).toBeInTheDocument();
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
  it("honors the configured display duration and interval without repeating a purchase", async () => {
    mocks.config.display_seconds = 3;
    mocks.config.interval_seconds = 15;
    mocks.invoke.mockResolvedValue({ data: { purchases: [{ createdAt: new Date(Date.now() - 120000).toISOString() }] } });
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByText("Compra real de filamentos.")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not fetch purchases when the admin turns notifications off", async () => {
    mocks.config.enabled = false;
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(70000); });
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

});
