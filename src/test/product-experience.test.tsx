import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProdutoPage } from "@/routes/produto.$slug";
const m = vi.hoisted(() => ({
  add: vi.fn(),
  nav: vi.fn(),
  product: {
    id: "p",
    name: "Filamento PLA",
    slug: "pla",
    brand: "MasterPrint",
    material: "PLA",
    weight: "1 kg",
    diameter: "1,75 mm",
    description: "Descrição real",
    price: 59.9,
    images: ["https://example.com/main.jpg", "https://example.com/black.jpg"],
    product_variants: [
      { id: "v", color: "Preto", color_hex: "#000000", stock: 1, sort: 0, sku: "BLACK" },
    ],
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    useParams: () => ({ slug: "pla" }),
    useSearch: () => ({}),
    useLoaderData: () => ({ product: m.product }),
  }),
  useNavigate: () => m.nav,
  notFound: () => ({ isNotFound: true }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: m.product }),
  queryOptions: (value: unknown) => value,
}));
vi.mock("@/lib/cart", () => ({ useCart: () => ({ items: [], add: m.add }) }));
vi.mock("@/components/site/ProductReviews", () => ({ ProductReviews: () => null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Product gallery and purchase preservation", () => {
  it("changes the photo with the selected color and preserves the correct variant in the cart", () => {
    render(<ProdutoPage />);
    fireEvent.click(screen.getByLabelText("Preto"));
    expect(screen.getByAltText("Filamento PLA — Preto")).toHaveAttribute(
      "src",
      m.product.images[1],
    );
    fireEvent.click(screen.getByLabelText("Ver foto 1"));
    expect(screen.getByAltText("Filamento PLA — Preto")).toHaveAttribute(
      "src",
      m.product.images[0],
    );
    fireEvent.click(screen.getByText("Adicionar ao carrinho"));
    expect(m.add).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: "v",
        color: "Preto",
        image: m.product.images[1],
        quantity: 1,
        price: 59.9,
      }),
    );
  });
  it("opens an accessible enlarged photo and clamps quantity to the existing limit", () => {
    render(<ProdutoPage />);
    fireEvent.click(screen.getByLabelText("Preto"));
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "99" } });
    expect(screen.getByLabelText("Quantidade")).toHaveValue(10);
    fireEvent.click(screen.getByLabelText("Ampliar foto do produto"));
    expect(within(screen.getByRole("dialog")).getByRole("img")).toHaveAttribute(
      "src",
      m.product.images[1],
    );
  });
});
