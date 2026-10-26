import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header } from "@/components/site/Header";
const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  categories: [{ id: "actual", name: "Categoria cadastrada", slug: "categoria-cadastrada" }],
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => state.navigate,
  Link: ({
    children,
    to,
    params,
    search: _search,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: { slug: string };
    search?: unknown;
  }) => (
    <a href={params ? to.replace("$slug", params.slug) : to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: state.categories }),
  queryOptions: (value: unknown) => value,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock("@/lib/cart", () => ({ useCart: () => ({ count: 3, subtotal: 179.7 }) }));
vi.mock("@/components/site/StoreSettings", () => ({
  useStoreSettings: () => ({ data: { whatsapp: "" } }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Storefront navigation", () => {
  it("only offers categories supplied by the existing database query", () => {
    render(<Header />);
    expect(
      within(screen.getByRole("navigation", { name: "Categorias da loja" })).getByText(
        "Categoria cadastrada",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ferramentas")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Fale conosco pelo WhatsApp" }),
    ).not.toBeInTheDocument();
  });
  it("searches with the existing catalog route and trims whitespace", () => {
    render(<Header />);
    const input = screen.getByRole("textbox", { name: "Pesquisar produtos" });
    fireEvent.change(input, { target: { value: "  impressora  " } });
    fireEvent.submit(input.closest("form")!);
    expect(state.navigate).toHaveBeenCalledWith({ to: "/produtos", search: { q: "impressora" } });
  });
  it("opens and closes mobile navigation while preserving the cart indicator", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "Carrinho, 3 itens" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Categorias no celular" })).getByText(
        "Categoria cadastrada",
      ),
    );
    expect(
      screen.queryByRole("navigation", { name: "Categorias no celular" }),
    ).not.toBeInTheDocument();
  });
});
