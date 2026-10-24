import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseNotificationSettings } from "../components/site/PurchaseNotificationSettings";
import { defaultPurchaseSettings, validatePurchaseSettings } from "../lib/purchase-notification-settings";

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), upsert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
  upsert: (...args: unknown[]) => { mocks.upsert(...args); return { select: () => ({ single: mocks.save }) }; },
}) } }));
const clients: QueryClient[] = [];
function showEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><PurchaseNotificationSettings/></QueryClientProvider>);
}
beforeEach(() => {
  mocks.read.mockResolvedValue({ data: defaultPurchaseSettings });
  mocks.save.mockResolvedValue({ data: { id: "main" }, error: null });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.clearAllMocks(); });

describe("Notification preferences", () => {
  it("validates duration, interval and at least one active message", () => {
    expect(() => validatePurchaseSettings({ ...defaultPurchaseSettings, display_seconds: 0 })).toThrow(/3 a 20/);
    expect(() => validatePurchaseSettings({ ...defaultPurchaseSettings, display_seconds: 20, interval_seconds: 20 })).toThrow(/5 segundos/);
    expect(() => validatePurchaseSettings({ ...defaultPurchaseSettings, messages: [{ text: "Mensagem", enabled: false }] })).toThrow(/Ative pelo menos/);
    expect(validatePurchaseSettings({ ...defaultPurchaseSettings, enabled: false, messages: [{ text: "Mensagem", enabled: false }] }).enabled).toBe(false);
  });

  it("saves selected messages and timings to the database", async () => {
    showEditor();
    const button = await screen.findByRole("button", { name: "Salvar notificações" });
    fireEvent.change(screen.getByLabelText("Título do aviso"), { target: { value: "Compra realizada!" } });
    fireEvent.change(screen.getByLabelText("Tempo na tela (segundos)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Intervalo entre avisos (segundos)"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Texto da mensagem 1"), { target: { value: "Um cliente comprou filamentos MasterPrint." } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar mensagem" }));
    fireEvent.change(screen.getByLabelText("Texto da mensagem 2"), { target: { value: "Mensagem desativada" } });
    fireEvent.click(screen.getByLabelText("Exibir mensagem 2"));
    fireEvent.submit(button.closest("form")!);
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "main", display_seconds: 8, interval_seconds: 45,
      messages: [{ text: "Um cliente comprou filamentos MasterPrint.", enabled: true }, { text: "Mensagem desativada", enabled: false }],
    }), { onConflict: "id" }));
    expect(await screen.findByText(/Preferências salvas/)).toBeInTheDocument();
  });

  it("does not claim a save succeeded when database permissions reject it", async () => {
    mocks.save.mockResolvedValue({ data: null, error: new Error("Sem permissão para salvar") });
    showEditor();
    const button = await screen.findByRole("button", { name: "Salvar notificações" });
    fireEvent.submit(button.closest("form")!);
    expect(await screen.findByText("Sem permissão para salvar")).toBeInTheDocument();
    expect(screen.queryByText(/Preferências salvas/)).toBeNull();
  });
});
