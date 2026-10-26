import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteReviews } from "@/components/site/SiteReviews";
const mocks = vi.hoisted(() => ({ eq: vi.fn(), range: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => {
        mocks.select(...args);
        return {
          eq: (...filter: unknown[]) => {
            mocks.eq(...filter);
            return { order: () => ({ order: () => ({ range: mocks.range }) }) };
          },
        };
      },
    }),
  },
}));
const clients: QueryClient[] = [];
const review = {
  id: "r1",
  author_name: "Cliente autorizado",
  rating: 5,
  comment: "Produto de ótima qualidade e atendimento atencioso.",
  source: "customer",
};
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <SiteReviews />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  vi.clearAllMocks();
});
describe("Storefront feedbacks", () => {
  it("loads approved feedbacks across products using only public fields", async () => {
    mocks.range.mockResolvedValue({
      data: [review, { ...review, id: "r2", source: "admin" }],
      count: 2,
    });
    show();
    expect(await screen.findAllByText(review.comment)).toHaveLength(2);
    expect(mocks.eq).toHaveBeenCalledWith("approved", true);
    expect(mocks.eq).not.toHaveBeenCalledWith("product_id", expect.anything());
    expect(mocks.select).toHaveBeenCalledWith("id,author_name,rating,comment,source", {
      count: "exact",
    });
    expect(screen.queryByText("(feedback cadastrado pela loja)")).not.toBeInTheDocument();
  });
  it("paginates without loading all reviews at once", async () => {
    mocks.range.mockResolvedValue({ data: [review], count: 7 });
    show();
    await screen.findByText(review.comment);
    fireEvent.click(screen.getByText("Mais feedbacks"));
    await waitFor(() => expect(mocks.range).toHaveBeenLastCalledWith(6, 11));
  });
  it("shows errors with retry and does not fabricate testimonials", async () => {
    mocks.range.mockResolvedValue({ data: null, error: new Error("Offline") });
    show();
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(
      /Não foi possível carregar/,
    );
    expect(screen.queryByText("Ainda não há feedbacks publicados.")).toBeNull();
    mocks.range.mockResolvedValue({ data: [], count: 0 });
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(await screen.findByText("Ainda não há feedbacks publicados.")).toBeInTheDocument();
  });
});
