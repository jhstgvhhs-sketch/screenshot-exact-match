import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreReviewForm } from "@/components/site/StoreReviewForm";
import { AdminAddReview } from "@/components/site/ProductReviews";
const mocks = vi.hoisted(() => ({ user: true, insert: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mocks.user ? { id: "customer" } : null }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: mocks.insert }) },
}));
beforeEach(() => {
  mocks.user = true;
  mocks.insert.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Store reviews", () => {
  it("lets authenticated customers submit store feedback without a product for approval", async () => {
    render(<StoreReviewForm />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Cliente" } });
    fireEvent.change(screen.getByLabelText("Sua avaliação da loja"), {
      target: { value: "Atendimento muito atencioso." },
    });
    fireEvent.click(screen.getByText("Enviar avaliação da loja"));
    await screen.findByText(/Avaliação da loja enviada para aprovação/);
    expect(mocks.insert).toHaveBeenCalledWith({
      product_id: null,
      author_name: "Cliente",
      rating: 5,
      comment: "Atendimento muito atencioso.",
      approved: false,
      source: "customer",
    });
  });
  it("requires login before submitting", () => {
    mocks.user = false;
    render(<StoreReviewForm />);
    expect(screen.getByText("Enviar avaliação da loja")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Minha Conta" })).toHaveAttribute("href", "/conta");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("reports backend errors without claiming success", async () => {
    mocks.insert.mockResolvedValue({ error: new Error("offline") });
    render(<StoreReviewForm />);
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Cliente" } });
    fireEvent.change(screen.getByLabelText("Sua avaliação da loja"), {
      target: { value: "Atendimento muito atencioso." },
    });
    fireEvent.click(screen.getByText("Enviar avaliação da loja"));
    await screen.findByText(/Não foi possível enviar/);
    expect(screen.getByLabelText("Sua avaliação da loja")).toHaveValue(
      "Atendimento muito atencioso.",
    );
  });
  it("allows administrators to add authorized store feedback without choosing a product", async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AdminAddReview products={[]} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Nome do cliente (autorizado)"), {
      target: { value: "Cliente" },
    });
    fireEvent.change(screen.getByLabelText("Depoimento"), {
      target: { value: "Atendimento muito atencioso." },
    });
    fireEvent.click(screen.getByText("Adicionar feedback"));
    await screen.findByText(/Feedback cadastrado/);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: null, source: "admin", approved: true }),
    );
    client.clear();
  });
});
