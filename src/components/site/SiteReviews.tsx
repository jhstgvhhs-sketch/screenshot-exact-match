import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ReviewCard, type PublicReview } from "./ReviewCard";
const SIZE = 6;
export function SiteReviews() {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["reviews", "storefront", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as unknown as SupabaseClient)
        .from("product_reviews")
        .select("id,author_name,rating,comment,source", { count: "exact" })
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * SIZE, page * SIZE + SIZE - 1);
      if (error) throw error;
      return { reviews: (data ?? []) as PublicReview[], count: count ?? 0 };
    },
    staleTime: 60000,
    retry: 1,
  });
  return (
    <section className="container-x mt-16" aria-labelledby="store-reviews-heading">
      <h2 id="store-reviews-heading" className="text-2xl font-bold md:text-3xl">
        Feedbacks dos clientes
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Veja as avaliações publicadas pelos clientes sobre os produtos da 3DFLEX.
      </p>
      {query.isLoading ? (
        <p className="mt-5 text-sm">Carregando feedbacks…</p>
      ) : query.isError ? (
        <div role="alert" className="mt-5 space-y-2 text-sm">
          <p>Não foi possível carregar os feedbacks.</p>
          <button
            type="button"
            className="text-primary underline"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : query.data && !query.data.count ? (
        <p className="mt-5 rounded-xl border p-5 text-sm text-muted-foreground">
          Ainda não há feedbacks publicados.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data?.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {query.data && query.data.count > SIZE && (
            <div className="mt-5 flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={page === 0}
                className="text-primary underline disabled:opacity-40"
                onClick={() => setPage(page - 1)}
              >
                Feedbacks anteriores
              </button>
              <span>Página {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * SIZE >= query.data.count}
                className="text-primary underline disabled:opacity-40"
                onClick={() => setPage(page + 1)}
              >
                Mais feedbacks
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
