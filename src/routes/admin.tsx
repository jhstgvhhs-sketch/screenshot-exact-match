import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { productsQuery, totalStock } from "@/lib/catalog";
import { brl } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — 3DFLEX" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data: products = [], isLoading: productsLoading } = useQuery({
    ...productsQuery(),
    enabled: !!user && isAdmin && !loading,
  });

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="container-x py-12">Verificando acesso...</section>;

  if (!user) return (
    <section className="container-x mx-auto max-w-lg py-12">
      <h1 className="text-3xl font-bold">Administração 3DFLEX</h1>
      <p className="mt-3 text-muted-foreground">Entre com sua conta autorizada para acessar o painel.</p>
      <form onSubmit={authenticate} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <label className="block text-sm font-semibold">E-mail
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
        </label>
        <label className="block text-sm font-semibold">Senha
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
        </label>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Entrando..." : "Entrar no painel"}</button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">A criação da conta e a autorização de administrador são realizadas separadamente, com segurança.</p>
    </section>
  );

  if (!isAdmin) return (
    <section className="container-x py-12">
      <h1 className="text-2xl font-bold">Acesso restrito</h1>
      <p className="mt-3 text-muted-foreground">Esta conta não possui permissão de administrador. Entre em contato com o responsável pela loja.</p>
      <button onClick={() => void supabase.auth.signOut()} className="mt-4 rounded-lg border border-input px-4 py-2">Sair da conta</button>
    </section>
  );

  return (
    <section className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">3DFLEX Admin</p>
          <h1 className="text-3xl font-bold">Painel administrativo</h1>
          <p className="mt-2 text-muted-foreground">Visão inicial do catálogo. Edição de produtos e imagens será habilitada após validação das permissões do banco.</p>
        </div>
        <button onClick={() => void supabase.auth.signOut()} className="rounded-lg border border-input px-4 py-2">Sair</button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Produtos</p><p className="mt-2 text-3xl font-bold">{products.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Variantes</p><p className="mt-2 text-3xl font-bold">{products.reduce((n, p) => n + p.product_variants.length, 0)}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Unidades em estoque</p><p className="mt-2 text-3xl font-bold">{products.reduce((n, p) => n + totalStock(p), 0)}</p></div>
      </div>
      <h2 className="mt-10 text-xl font-bold">Catálogo</h2>
      {productsLoading ? <p className="mt-4">Carregando produtos...</p> : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card"><tr><th className="p-4">Produto</th><th className="p-4">Preço</th><th className="p-4">Cores</th><th className="p-4">Estoque</th><th className="p-4">Loja</th></tr></thead>
            <tbody>{products.map((p) => <tr key={p.id} className="border-t border-border">
              <td className="p-4 font-semibold">{p.name}</td><td className="p-4">{brl(p.price)}</td>
              <td className="p-4">{p.product_variants.length}</td><td className="p-4">{totalStock(p)}</td>
              <td className="p-4"><Link to="/produto/$slug" params={{ slug: p.slug }} className="text-primary underline">Visualizar</Link></td>
            </tr>)}</tbody>
          </table>
          {!products.length && <p className="p-4 text-muted-foreground">Nenhum produto disponível.</p>}
        </div>
      )}
    </section>
  );
}
