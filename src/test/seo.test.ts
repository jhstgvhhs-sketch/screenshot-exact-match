import { describe, expect, it } from "vitest";
import { productHead, publicPageHead, safeJsonLd, sitemapXml } from "@/lib/seo";
import type { Product } from "@/lib/catalog";
const product = {
  id: "p",
  name: "Filamento PLA MasterPrint 1kg",
  slug: "pla-masterprint",
  brand: "MasterPrint",
  material: "PLA",
  description: "Descrição real do filamento.",
  price: 59.9,
  images: ["https://example.com/main.jpg", "https://example.com/black.jpg"],
  product_variants: [{ id: "v", color: "Preto", sku: "PLA-PRETO", stock: 1, sort: 0 }],
} as Product;
describe("Commerce SEO", () => {
  it("uses actual variant name, image, price and availability", () => {
    const head = productHead(product, "v");
    expect(head.meta).toContainEqual({ title: "Filamento PLA MasterPrint 1kg — Preto | 3DFLEX" });
    expect(head.meta).toContainEqual({ property: "og:image", content: product.images[1] });
    const data = JSON.parse(head.scripts[0].children);
    expect(data.offers).toMatchObject({
      price: "59.90",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    });
    expect(data.sku).toBe("PLA-PRETO");
    expect(data).not.toHaveProperty("aggregateRating");
    expect(head.links[0].href).toContain("/produto/pla-masterprint?cor=v");
  });
  it("distinguishes filament preorders from unavailable accessories", () => {
    const unavailable = {
      ...product,
      product_variants: [{ ...product.product_variants[0], stock: 0 }],
    };
    expect(JSON.parse(productHead(unavailable).scripts[0].children).offers.availability).toBe(
      "https://schema.org/PreOrder",
    );
    expect(
      JSON.parse(productHead({ ...unavailable, name: "Acessório" }).scripts[0].children).offers
        .availability,
    ).toBe("https://schema.org/OutOfStock");
  });
  it("escapes JSON-LD script injection and sitemap XML", () => {
    expect(safeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
    const xml = sitemapXml(["filamento", "filamento", "a&b"]);
    expect(xml.match(/produto\/filamento/g)).toHaveLength(1);
    expect(xml).toContain("a%26b");
    expect(xml).not.toMatch(/checkout|conta|admin|recuperar/);
  });
  it("provides canonical and shared metadata", () => {
    const head = publicPageHead("/produtos", "Catálogo | 3DFLEX", "Descrição do catálogo");
    expect(head.links[0].rel).toBe("canonical");
    expect(head.meta).toContainEqual({ property: "og:locale", content: "pt_BR" });
  });
});
