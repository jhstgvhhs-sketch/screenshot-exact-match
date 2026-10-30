import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import spool from "@/assets/spool.jpg";

export type Variant = { id: string; color: string; color_hex: string | null; sku: string; stock: number; sort: number };
export type Product = {
  id: string; name: string; slug: string; brand: string | null; material: string | null; weight: string | null;
  diameter: string | null; description: string | null; price: number; images: string[]; featured: boolean;
  created_at: string; category_id: string | null;
  categories: { name: string; slug: string } | null;
  product_variants: Variant[];
};

export const productImage = (p: Pick<Product, "images">) => p.images?.[0] || spool;

const SELECT = "*, categories(name, slug), product_variants(*)";

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(SELECT).eq("active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Product[]).map((p) => ({ ...p, price: Number(p.price), product_variants: [...p.product_variants].sort((a, b) => a.sort - b.sort) }));
    },
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    staleTime: 60_000,
    queryFn: async () => {
      // Keep direct product URLs independent from PostgREST relationship embedding.
      // The catalog query already embeds these relationships; this fallback reads
      // the product, category and variants explicitly to avoid schema-cache issues.
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) return null;

      let categories: Product["categories"] = null;
      if (product.category_id) {
        const { data: category, error: categoryError } = await supabase
          .from("categories")
          .select("name,slug")
          .eq("id", product.category_id)
          .maybeSingle();
        if (categoryError) throw categoryError;
        categories = category ? { name: category.name, slug: category.slug } : null;
      }

      const { data: variants, error: variantsError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("sort", { ascending: true });
      if (variantsError) throw variantsError;

      return {
        ...product,
        price: Number(product.price),
        categories,
        images: Array.isArray(product.images) ? product.images : [],
        product_variants: variants ?? [],
      } as Product;
    },
  });

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort");
      if (error) throw error;
      return data;
    },
  });

export const totalStock = (p: Product) => p.product_variants.reduce((a, v) => a + v.stock, 0);
