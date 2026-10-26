import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function StoreReviewForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    if (name.trim().length < 2 || comment.trim().length < 10) {
      setMessage("Informe seu nome e um comentário de pelo menos 10 caracteres.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await (supabase as unknown as SupabaseClient)
        .from("product_reviews")
        .insert({
          product_id: null,
          author_name: name.trim(),
          rating,
          comment: comment.trim(),
          approved: false,
          source: "customer",
        });
      if (error) throw error;
      setComment("");
      setMessage("Avaliação da loja enviada para aprovação. Obrigado pelo seu feedback!");
    } catch {
      setMessage("Não foi possível enviar sua avaliação. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const input = "mt-1 w-full rounded-lg border border-input bg-background p-3";
  return (
    <form
      onSubmit={submit}
      className="mt-8 max-w-xl space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-bold">Avalie sua experiência com a 3DFLEX</h3>
      <p className="text-sm text-muted-foreground">
        Conte como foi comprar ou ser atendido pela loja. Não é necessário selecionar um produto.
        Seu nome e comentário serão públicos após aprovação.
      </p>
      {!user && (
        <p className="text-sm">
          Entre em{" "}
          <a href="/conta" className="text-primary underline">
            Minha Conta
          </a>{" "}
          para enviar sua avaliação.
        </p>
      )}
      <label className="block text-sm">
        Seu nome
        <input
          required
          minLength={2}
          maxLength={80}
          value={name}
          disabled={busy || !user}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
      </label>
      <label className="block text-sm">
        Sua nota
        <select
          value={rating}
          disabled={busy || !user}
          onChange={(e) => setRating(Number(e.target.value))}
          className={input}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} estrela(s)
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Sua avaliação da loja
        <textarea
          required
          minLength={10}
          maxLength={1500}
          rows={4}
          value={comment}
          disabled={busy || !user}
          onChange={(e) => setComment(e.target.value)}
          className={input}
        />
      </label>
      <button
        type="submit"
        disabled={busy || !user}
        className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Enviando..." : "Enviar avaliação da loja"}
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
