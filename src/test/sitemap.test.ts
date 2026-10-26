import { beforeEach, describe, expect, it, vi } from "vitest";
import { sitemapResponse } from "@/lib/sitemap";
const m = vi.hoisted(() => ({ table: vi.fn(), select: vi.fn(), eq: vi.fn(), range: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (name: string) => {
      m.table(name);
      const query = {
        select: (value: string) => {
          m.select(value);
          return query;
        },
        eq: (...args: unknown[]) => {
          m.eq(...args);
          return query;
        },
        order: () => query,
        range: m.range,
      };
      return query;
    },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
});
describe("Public catalog sitemap", () => {
  it("queries only active public slugs and generates XML", async () => {
    m.range.mockResolvedValue({ data: [{ slug: "pla-masterprint" }], error: null });
    const response = await sitemapResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(await response.text()).toContain("/produto/pla-masterprint");
    expect(m.table).toHaveBeenCalledWith("products");
    expect(m.select).toHaveBeenCalledWith("slug");
    expect(m.eq).toHaveBeenCalledWith("active", true);
  });
  it("does not silently return an empty sitemap on backend failure", async () => {
    m.range.mockResolvedValue({ data: null, error: new Error("network") });
    const response = await sitemapResponse();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("paginates past the database row limit", async () => {
    m.range
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => ({ slug: `product-${i}` })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ slug: "last" }], error: null });
    const response = await sitemapResponse();
    expect(await response.text()).toContain("/produto/last");
    expect(m.range).toHaveBeenLastCalledWith(1000, 1999);
  });
});
