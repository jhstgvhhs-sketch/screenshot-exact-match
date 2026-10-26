import type { Product } from "./catalog";
import { productImage } from "./catalog";
export function siteOrigin(): string {
  const configured = import.meta.env["VITE_SITE_URL"] || "https://screen-into-sites.lovable.app";
  try {
    const url = new URL(configured);
    if (url.protocol === "https:") return url.origin;
  } catch {
    /* use the verified existing storefront */
  }
  return "https://screen-into-sites.lovable.app";
}
export function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin()).href;
}
export const safeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
export function publicPageHead(path: string, title: string, description: string, image?: string) {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:locale", content: "pt_BR" },
      ...(image ? [{ property: "og:image", content: absoluteUrl(image) }] : []),
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(image ? [{ name: "twitter:image", content: absoluteUrl(image) }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
export function productHead(product: Product, variantId?: string) {
  const index = product.product_variants.findIndex((v) => v.id === variantId);
  const variant = product.product_variants[index];
  const name = product.name + (variant ? ` — ${variant.color}` : "");
  const image =
    index >= 0 ? product.images[index + 1] || productImage(product) : productImage(product);
  const path =
    `/produto/${encodeURIComponent(product.slug)}` +
    (variant ? `?cor=${encodeURIComponent(variant.id)}` : "");
  const description = (
    product.description?.trim() ||
    `${name}. ${[product.brand, product.material, product.weight, product.diameter].filter(Boolean).join(" · ")}. Confira as opções e compre na 3DFLEX.`
  )
    .replace(/\s+/g, " ")
    .slice(0, 160);
  const variants = variant ? [variant] : product.product_variants;
  const availability = variants.some((v) => v.stock > 0)
    ? "InStock"
    : variants.length && /filamento/i.test(product.name)
      ? "PreOrder"
      : "OutOfStock";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: [absoluteUrl(image)],
    url: absoluteUrl(path),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(variant ? { sku: variant.sku, color: variant.color } : {}),
    ...(product.material ? { material: product.material } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "BRL",
      price: Number(product.price).toFixed(2),
      availability: `https://schema.org/${availability}`,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  return {
    ...publicPageHead(path, `${name} | 3DFLEX`, description, image),
    meta: [
      ...publicPageHead(path, `${name} | 3DFLEX`, description, image).meta,
      { property: "og:type", content: "product" },
    ],
    scripts: [{ type: "application/ld+json", children: safeJsonLd(schema) }],
  };
}
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!,
  );
export function sitemapXml(slugs: string[]) {
  const paths = [
    "/",
    "/produtos",
    ...Array.from(new Set(slugs)).map((slug) => `/produto/${encodeURIComponent(slug)}`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escapeXml(absoluteUrl(path))}</loc></url>`).join("")}</urlset>`;
}
