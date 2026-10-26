import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Review = {
  id: string;
  product_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  approved: boolean;
  source?: string;
};
const table = () => (supabase as unknown as SupabaseClient).from("product_reviews");
const SIZE = 25;
export function ReviewModeration() {
  const client = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["reviews-pending", "management", filter, page],
    queryFn: async () => {
      let request = table().select("id,product_id,author_name,rating,comment,approved,source", {
        count: "exact",
      });
      if (filter !== "all") request = request.eq("approved", filter === "approved");
      const { data, error, count } = await request
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * SIZE, page * SIZE + SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Review[], count: count ?? 0 };
    },
  });
  async function moderate(review: Review, approve: boolean) {
    if (busy) return;
    if (
      !approve &&
      !window.confirm(
        `Apagar a avaliação de "${review.author_name}"? Ela será removida da loja e esta ação não pode ser desfeita.`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const request = approve ? table().update({ approved: true }) : table().delete();
      const { data, error } = await request.eq("id", review.id).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou a alteração.");
      setMessage(approve ? "Avaliação aprovada." : "Avaliação apagada.");
      if (!approve && page > 0 && query.data?.rows.length === 1) setPage(page - 1);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["reviews-pending"] }),
        client.invalidateQueries({ queryKey: ["reviews"] }),
      ]);
    } catch {
      setMessage("Não foi possível alterar a avaliação. Atualize a lista e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-10 space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">Gerenciar avaliações</h2>
      <label className="block text-sm">
        Exibir avaliações
        <select
          value={filter}
          disabled={busy}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="mt-2 w-full rounded-lg border border-input bg-background p-3 sm:w-auto"
        >
          <option value="all">Todas</option>
          <option value="approved">Publicadas</option>
          <option value="pending">Aguardando aprovação</option>
        </select>
      </label>
      {query.isLoading ? (
        <p>Carregando avaliações...</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Não foi possível carregar as avaliações.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="text-primary underline"
          >
            Consultar novamente
          </button>
        </div>
      ) : !query.data?.count ? (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação neste filtro.</p>
      ) : (
        query.data.rows.map((review) => (
          <article key={review.id} className="space-y-2 rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">
              {review.approved ? "Publicada" : "Aguardando aprovação"} ·{" "}
              {review.product_id ? "Produto" : "Loja"}
              {review.source === "admin" ? " · Cadastrada pela loja" : " · Enviada pelo cliente"}
            </p>
            <p className="font-semibold">
              {review.author_name} — {review.rating}/5
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{review.comment}</p>
            <div className="flex flex-wrap gap-3">
              {!review.approved && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void moderate(review, true)}
                  className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Aprovar
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void moderate(review, false)}
                className="rounded-lg border border-destructive px-4 py-2 font-semibold text-destructive disabled:opacity-50"
              >
                Apagar avaliação
              </button>
            </div>
          </article>
        ))
      )}
      {query.data && query.data.count > SIZE && (
        <div className="flex items-center gap-4 text-sm">
          <button
            type="button"
            disabled={busy || page === 0}
            onClick={() => setPage(page - 1)}
            className="text-primary disabled:opacity-40"
          >
            Anterior
          </button>
          <span>Página {page + 1}</span>
          <button
            type="button"
            disabled={busy || (page + 1) * SIZE >= query.data.count}
            onClick={() => setPage(page + 1)}
            className="text-primary disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
