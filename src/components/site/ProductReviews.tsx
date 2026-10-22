import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Review = { id: string; product_id: string; author_name: string; rating: number; comment: string; approved: boolean; created_at: string; source?: string };
const reviewsTable = () => (supabase as unknown as { from: (name: string) => any }).from("product_reviews");

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data: reviews = [], isError } = useQuery<Review[]>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await reviewsTable().select("id,product_id,author_name,rating,comment,approved,created_at,source").eq("product_id", productId).eq("approved", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMessage("");
    try {
      const { error } = await reviewsTable().insert({ product_id: productId, author_name: name.trim(), rating, comment: comment.trim(), approved: false });
      if (error) throw error;
      setComment(""); setMessage("Avaliação enviada para aprovação.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível enviar a avaliação."); }
    finally { setBusy(false); }
  }
  const average = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;
  return <section className="container-x pb-14">
    <h2 className="text-2xl font-bold">Avaliações de clientes</h2>
    <p className="mt-2 text-muted-foreground">{average ? `★ ${average}/5 · ${reviews.length} avaliação(ões)` : "Ainda não há avaliações publicadas."}</p>
    {isError && <p className="mt-3 text-sm text-destructive">Avaliações indisponíveis. Verifique a configuração do banco.</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">{reviews.map(r => <article key={r.id} className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold">{r.author_name} {r.source === "admin" && <span className="text-xs font-normal text-muted-foreground">(feedback cadastrado pela loja)</span>} <span className="text-primary">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span></p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{r.comment}</p>
    </article>)}</div>
    <form onSubmit={submit} className="mt-8 max-w-xl space-y-4 rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Deixe sua avaliação</h3>
      {!user && <p className="text-sm text-muted-foreground">Entre na sua conta para enviar uma avaliação.</p>}
      <label className="block text-sm">Nome<input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3"/></label>
      <label className="block text-sm">Nota<select value={rating} onChange={e => setRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input bg-background p-3">{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} estrela(s)</option>)}</select></label>
      <label className="block text-sm">Comentário<textarea required minLength={10} maxLength={1500} rows={4} value={comment} onChange={e => setComment(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3"/></label>
      <button disabled={busy || !user} type="submit" className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Enviando..." : "Enviar avaliação"}</button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  </section>;
}

export function AdminAddReview({ products }: { products: { id: string; name: string }[] }) {
  const client = useQueryClient();
  const [productId, setProductId] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productId || author.trim().length < 2 || comment.trim().length < 10) { setMessage("Preencha produto, autor e comentário válido."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await reviewsTable().insert({ product_id: productId, author_name: author.trim(), rating, comment: comment.trim(), approved: true, source: "admin" });
      if (error) throw error;
      setAuthor(""); setComment("");
      setMessage("Feedback cadastrado e identificado como enviado pela loja.");
      void client.invalidateQueries({ queryKey: ["reviews"] });
      void client.invalidateQueries({ queryKey: ["reviews-pending"] });
    } catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível cadastrar o feedback."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-10 space-y-4 rounded-xl border border-border bg-card p-5">
    <h2 className="text-xl font-bold">Adicionar feedback recebido</h2>
    <p className="text-sm text-muted-foreground">Cadastre apenas depoimentos reais, com autorização do cliente. Eles serão identificados publicamente como cadastrados pela loja, sem selo de compra verificada.</p>
    <label className="block text-sm">Produto<select required value={productId} onChange={e => setProductId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3"><option value="">Selecione um produto</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="block text-sm">Nome do cliente (autorizado)<input required minLength={2} maxLength={80} value={author} onChange={e => setAuthor(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3"/></label>
    <label className="block text-sm">Nota<select value={rating} onChange={e => setRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-input bg-background p-3">{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} estrela(s)</option>)}</select></label>
    <label className="block text-sm">Depoimento<textarea required minLength={10} maxLength={1500} rows={4} value={comment} onChange={e => setComment(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-3"/></label>
    <button type="submit" disabled={busy} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Salvando..." : "Adicionar feedback"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}

export function ReviewModeration() {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const { data: pending = [] } = useQuery<Review[]>({
    queryKey: ["reviews-pending"],
    queryFn: async () => {
      const { data, error } = await reviewsTable().select("*").eq("approved", false).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  async function moderate(id: string, approve: boolean) {
    setMessage("");
    const result = approve ? await reviewsTable().update({ approved: true }).eq("id", id).select("id").single() : await reviewsTable().delete().eq("id", id).select("id").single();
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(approve ? "Avaliação aprovada." : "Avaliação removida.");
    void client.invalidateQueries({ queryKey: ["reviews-pending"] });
    void client.invalidateQueries({ queryKey: ["reviews"] });
  }
  return <section className="mt-10 rounded-xl border border-border bg-card p-5">
    <h2 className="text-xl font-bold">Feedbacks aguardando aprovação</h2>
    {!pending.length && <p className="mt-3 text-sm text-muted-foreground">Nenhuma avaliação pendente.</p>}
    <div className="mt-4 space-y-3">{pending.map(r => <div key={r.id} className="rounded-lg border border-border p-4">
      <p className="font-semibold">{r.author_name} — {r.rating}/5</p><p className="mt-2 text-sm">{r.comment}</p>
      <div className="mt-3 flex gap-3"><button onClick={() => void moderate(r.id,true)} className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Aprovar</button><button onClick={() => void moderate(r.id,false)} className="rounded-lg border border-destructive px-4 py-2 text-destructive">Rejeitar</button></div>
    </div>)}</div>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
