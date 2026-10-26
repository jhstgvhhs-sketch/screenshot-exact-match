import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
const m = vi.hoisted(() => ({
  range: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const mutation = {
        eq: (...args: unknown[]) => {
          m.eq(...args);
          return { select: () => ({ single: m.save }) };
        },
      };
      const query = {
        eq: (...args: unknown[]) => {
          m.eq(...args);
          return query;
        },
        order: () => query,
        range: m.range,
      };
      return {
        select: () => query,
        delete: () => {
          m.remove();
          return mutation;
        },
        update: (...args: unknown[]) => {
          m.update(...args);
          return mutation;
        },
      };
    },
  },
}));
const row = {
  id: "review-1",
  product_id: null,
  author_name: "Cliente",
  rating: 5,
  comment: "Atendimento muito atencioso.",
  approved: true,
  source: "admin",
};
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  m.range.mockResolvedValue({ data: [row], count: 1 });
  m.save.mockResolvedValue({ data: { id: row.id }, error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});
const show = () =>
  render(
    <QueryClientProvider client={client}>
      <ReviewModeration />
    </QueryClientProvider>,
  );
describe("Admin review management", () => {
  it("lists published reviews and deletes only the confirmed review", async () => {
    show();
    fireEvent.click(await screen.findByText("Apagar avaliação"));
    await screen.findByText("Avaliação apagada.");
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('"Cliente"'));
    expect(m.remove).toHaveBeenCalledTimes(1);
    expect(m.eq).toHaveBeenCalledWith("id", row.id);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("does nothing if the administrator cancels", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    show();
    fireEvent.click(await screen.findByText("Apagar avaliação"));
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("reports rejected deletions without claiming success", async () => {
    m.save.mockResolvedValue({ error: new Error("RLS") });
    show();
    fireEvent.click(await screen.findByText("Apagar avaliação"));
    await screen.findByText(/Não foi possível alterar/);
    expect(screen.queryByText("Avaliação apagada.")).not.toBeInTheDocument();
  });
  it("keeps approval available for pending reviews", async () => {
    m.range.mockResolvedValue({ data: [{ ...row, approved: false }], count: 1 });
    show();
    fireEvent.click(await screen.findByText("Aprovar"));
    await screen.findByText("Avaliação aprovada.");
    expect(m.update).toHaveBeenCalledWith({ approved: true });
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("filters and paginates using backend queries", async () => {
    m.range.mockResolvedValue({ data: [row], count: 26 });
    show();
    await screen.findByText("Apagar avaliação");
    fireEvent.click(screen.getByText("Próxima"));
    await waitFor(() => expect(m.range).toHaveBeenLastCalledWith(25, 49));
    fireEvent.change(screen.getByLabelText("Exibir avaliações"), { target: { value: "approved" } });
    await waitFor(() => expect(m.eq).toHaveBeenCalledWith("approved", true));
    expect(m.range).toHaveBeenLastCalledWith(0, 24);
  });
});
