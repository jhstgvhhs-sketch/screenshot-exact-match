import { supabase } from "@/integrations/supabase/client";
import { sitemapXml } from "./seo";
// Uses only public product fields and the existing public catalog RLS. Never uses a service key.
export async function sitemapResponse() {
  try {
    const slugs: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("products")
        .select("slug")
        .eq("active", true)
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      slugs.push(...data.map((product) => product.slug));
      if (data.length < 1000) break;
    }
    return new Response(sitemapXml(slugs), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Sitemap temporariamente indisponível.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
}
