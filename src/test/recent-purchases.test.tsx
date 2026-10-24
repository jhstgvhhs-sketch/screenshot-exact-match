import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecentPurchases } from "../components/site/RecentPurchases";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), pathname: "/", config: { enabled: true, title: "Destaque 3DFLEX", messages: [{ text: "Conheça nossos filamentos.", enabled: true }], display_seconds: 6, interval_seconds: 60 } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/purchase-notification-settings", () => ({ usePurchaseNotificationSettings: () => ({ data: mocks.config, isError: false }) }));
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => mocks.pathname }));
beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); mocks.pathname = "/"; mocks.config.enabled = true; mocks.config.display_seconds = 6; mocks.config.interval_seconds = 60; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("Promotional notifications", () => {
  it("shows promotions without requesting purchase events and respects display duration", async () => {
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByText("Mensagem promocional da loja")).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(54000); });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("dismisses promotions for the session", async () => {
    const { unmount } = render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    fireEvent.click(screen.getByLabelText("Fechar mensagens promocionais"));
    unmount(); render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(70000); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each(["/checkout", "/carrinho", "/admin", "/minha-conta"])("does not show promotions on %s", async path => {
    mocks.pathname = path;
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(70000); });
    expect(screen.queryByRole("status")).toBeNull();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("honors disabled settings", async () => {
    mocks.config.enabled = false;
    render(<RecentPurchases/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(70000); });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
