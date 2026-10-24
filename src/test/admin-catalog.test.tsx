import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  updates: vi.fn(),
  deletes: vi.fn(),
  inserts: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));
vi.mock("@/lib/catalog", () => ({
  categoriesQuery: () => ({ queryKey: ["categories"], queryFn: async () => [] }),
}));
import { ProductEditor, NewProductForm } from "@/components/admin/CatalogEditors";
import type { Product } from "@/lib/catalog";
const product = {
  id: "p",
  name: "Filamento PLA",
  slug: "filamento-pla",
  price: 59.9,
  images: [],
  material: "PLA",
  brand: "MasterPrint",
  weight: "1kg",
  diameter: "1,75mm",
  description: "",
  category_id: null,
  product_variants: [
    { id: "v1", color: "Preto", color_hex: "#000000", sku: "PLA-PRETO", stock: 1, sort: 0 },
    { id: "v2", color: "Branco", color_hex: "#ffffff", sku: "PLA-BRANCO", stock: 1, sort: 1 },
  ],
} as unknown as Product;
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  m.from.mockImplementation((table: string) => {
    const q: any = {};
    for (const k of ["select", "eq", "limit"]) q[k] = vi.fn(() => q);
    q.update = (payload: unknown) => {
      m.updates(table, payload);
      return q;
    };
    q.insert = (payload: unknown) => {
      m.inserts(table, payload);
      return q;
    };
    q.delete = () => {
      m.deletes(table);
      return q;
    };
    q.single = vi.fn(async () => ({ data: { id: "saved" }, error: null }));
    q.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    q.then = (resolve: any) =>
      resolve({ data: table === "order_items" ? [{ id: "historical" }] : [], error: null });
    return q;
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
});
const wrap = (children: React.ReactNode) =>
  render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
describe("Existing catalog editors", () => {
  it("saves the edited variant stock without deleting or recreating products", async () => {
    wrap(<ProductEditor product={product} initiallyEditing onSaved={() => {}} />);
    fireEvent.change(screen.getAllByLabelText("Estoque")[0], { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e salvar alterações" }));
    await waitFor(() =>
      expect(m.updates).toHaveBeenCalledWith(
        "product_variants",
        expect.objectContaining({ stock: 2, color: "Preto" }),
      ),
    );
    expect(m.deletes).not.toHaveBeenCalled();
    expect(m.inserts).not.toHaveBeenCalled();
    expect(m.updates.mock.calls.find((call) => call[0] === "products")?.[1]).toMatchObject({
      price: 59.9,
      material: "PLA",
    });
  });
  it("refuses to delete a color already linked to an order", async () => {
    wrap(<ProductEditor product={product} initiallyEditing onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir somente a cor Preto" }));
    expect(await screen.findByText(/vinculada a um pedido/)).toBeInTheDocument();
    expect(m.deletes).not.toHaveBeenCalled();
  });
  it("creates an inactive product with explicit material and keeps initial stock per color", async () => {
    wrap(<NewProductForm categories={[]} onSaved={() => {}} />);
    fireEvent.change(screen.getByLabelText("Material"), { target: { value: "PLA" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar produto como inativo" }));
    await waitFor(() =>
      expect(m.inserts).toHaveBeenCalledWith(
        "products",
        expect.objectContaining({ active: false, material: "PLA" }),
      ),
    );
    const variants = m.inserts.mock.calls.find((call) => call[0] === "product_variants")?.[1];
    expect(variants.every((v: any) => v.stock === 1)).toBe(true);
    expect(m.deletes).not.toHaveBeenCalled();
  });
});
