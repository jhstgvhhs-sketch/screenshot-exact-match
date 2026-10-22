import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/lib/catalog";
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
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
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
      if (registering) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage(data.session ? "Conta criada. O acesso administrativo precisa ser autorizado." : "Cadastro solicitado. Confira seu e-mail para confirmar a conta. O acesso administrativo precisa ser autorizado.");
        setRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
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
      <p className="mt-3 text-muted-foreground">Entre com sua conta ou crie uma nova. O acesso ao painel exige autorização administrativa.</p>
      <form onSubmit={authenticate} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <label className="block text-sm font-semibold">E-mail
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
        </label>
        <label className="block text-sm font-semibold">Senha
          <input type="password" required autoComplete={registering ? "new-password" : "current-password"} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
        </label>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Aguarde..." : registering ? "Criar conta" : "Entrar no painel"}</button>
        <button type="button" disabled={busy} onClick={() => { setRegistering(!registering); setMessage(""); setPassword(""); }} className="w-full text-sm font-semibold text-primary underline">{registering ? "Já tenho conta — Entrar" : "Não tenho conta — Criar conta"}</button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">Após criar a conta, confirme seu e-mail se solicitado. O cadastro não concede privilégios administrativos.</p>
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
      <NewProductForm onSaved={() => void queryClient.invalidateQueries({ queryKey: ["products"] })} />
      <h2 className="mt-10 text-xl font-bold">Catálogo</h2>
      <p className="mt-2 text-sm text-muted-foreground">Edite o preço e o estoque de cada cor. As alterações são gravadas no banco da loja somente quando você clicar em Salvar.</p>
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
      <div className="mt-8 space-y-6">{products.map((p) => <ProductEditor key={p.id} product={p} onSaved={() => void queryClient.invalidateQueries({ queryKey: ["products"] })} />)}</div>
    </section>
  );
}

function ProductEditor({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [price, setPrice] = useState(String(product.price));
  const [stocks, setStocks] = useState<Record<string, string>>(() => Object.fromEntries(product.product_variants.map(v => [v.id, String(v.stock)])));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedPrice = Number(price.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || !/^\d+([.,]\d{1,2})?$/.test(price.trim())) { setFeedback("Informe um preço válido, com até duas casas decimais."); return; }
    const changes = product.product_variants.filter(v => Number(stocks[v.id]) !== v.stock);
    if (changes.some(v => !/^\d+$/.test(stocks[v.id] ?? "") || !Number.isSafeInteger(Number(stocks[v.id])))) { setFeedback("O estoque deve ser um número inteiro não negativo."); return; }
    setSaving(true);
    setFeedback("");
    try {
      if (parsedPrice !== product.price) {
        const { data, error } = await supabase.from("products").update({ price: parsedPrice }).eq("id", product.id).select("id").single();
        if (error) throw error;
        if (!data) throw new Error("O banco não confirmou a atualização do preço.");
      }
      for (const v of changes) {
        const { data, error } = await supabase.from("product_variants").update({ stock: Number(stocks[v.id]) }).eq("id", v.id).eq("product_id", product.id).select("id").single();
        if (error) throw error;
        if (!data) throw new Error("O banco não confirmou a atualização de " + v.color);
      }
      setFeedback("Alterações salvas no banco da loja.");
      onSaved();
    } catch (error) {
      setFeedback((error instanceof Error ? error.message : "Erro ao salvar.") + " Verifique as permissões de edição do Lovable Cloud.");
      onSaved();
    } finally { setSaving(false); }
  }
  return <form onSubmit={save} className="rounded-xl border border-border bg-card p-5">
    <h3 className="text-lg font-bold">{product.name}</h3>
    <label className="mt-4 block max-w-xs text-sm font-semibold">Preço (R$)
      <input required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
    </label>
    <h4 className="mt-6 font-semibold">Estoque por cor</h4>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{product.product_variants.map(v => <label key={v.id} className="text-sm">{v.color}
      <input type="number" min="0" step="1" required value={stocks[v.id] ?? ""} onChange={e => setStocks(prev => ({ ...prev, [v.id]: e.target.value }))} className="mt-1 w-full rounded-lg border border-input bg-background p-2" />
    </label>)}</div>
    {feedback && <p role="status" className="mt-4 text-sm">{feedback}</p>}
    <button disabled={saving} type="submit" className="mt-5 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Salvar preço e estoque"}</button>
  </form>;
}

const PETG_COLORS = [
  "Preto", "Branco", "Translúcido Amarelo", "Translúcido Azul", "Translúcido Vermelho",
  "Prata", "Transparente", "Marrom", "Madeira", "Fosco Branco",
  "Fosforescente Rainbow", "Lavanda", "Fluorescente Roxo", "Fibra de Carbono",
  "Translúcido Verde", "Roxo", "Branco PCV Outdoor", "Translúcido Branco",
  "Cool Grey", "Green Olive",
];

function NewProductForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("Filamento PETG MasterPrint 1kg — 1,75mm");
  const [slug, setSlug] = useState("filamento-petg-masterprint-1kg");
  const [price, setPrice] = useState("69,90");
  const [description, setDescription] = useState("Filamento PETG MasterPrint para impressão 3D. Bobina de 1 kg, diâmetro de 1,75 mm.");
  const [colors, setColors] = useState(PETG_COLORS.join("\n"));
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(price.replace(",", "."));
    const names = [...new Set(colors.split("\n").map(s => s.trim()).filter(Boolean))];
    if (!name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\d+([.,]\d{1,2})?$/.test(price.trim()) || value <= 0 || !names.length) {
      setFeedback("Confira nome, identificador, preço e cores."); return;
    }
    setBusy(true); setFeedback("");
    try {
      const { data: existing, error: lookupError } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) throw new Error("Já existe um produto com este identificador.");
      const { data: product, error } = await supabase.from("products").insert({
        name: name.trim(), slug, price: value, brand: "MasterPrint", material: "PETG",
        weight: "1kg", diameter: "1,75mm", description: description.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : [], active: false, featured: false,
      }).select("id").single();
      if (error) throw error;
      if (!product) throw new Error("O banco não confirmou o cadastro do produto.");
      const { error: variantsError } = await supabase.from("product_variants").insert(names.map((color, index) => ({
        product_id: product.id, color, sku: "MP-PETG-" + product.id.slice(0, 8) + "-" + (index + 1).toString().padStart(2, "0"),
        stock: 1, sort: index,
      })));
      if (variantsError) throw new Error("Produto criado como inativo, mas as cores não foram salvas: " + variantsError.message);
      setFeedback("Produto e " + names.length + " cores cadastrados como INATIVOS. A publicação na loja será feita em uma etapa separada.");
      onSaved();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível cadastrar o produto.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={create} className="mt-10 rounded-xl border border-border bg-card p-5">
    <h2 className="text-xl font-bold">Cadastrar novo produto</h2>
    <p className="mt-2 text-sm text-muted-foreground">Novo produto é criado inativo, para você revisar antes de disponibilizar na loja.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Nome<input required value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label>
      <label className="text-sm font-semibold">Identificador (URL)<input required value={slug} onChange={e => setSlug(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label>
      <label className="text-sm font-semibold">Preço (R$)<input required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label>
      <label className="text-sm font-semibold">URL da foto principal (opcional)<input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label>
    </div>
    <label className="mt-4 block text-sm font-semibold">Descrição<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label>
    <label className="mt-4 block text-sm font-semibold">Cores (uma por linha)<textarea required rows={9} value={colors} onChange={e => setColors(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" /></label>
    <p className="mt-2 text-sm text-muted-foreground">Estoque inicial: 1 unidade por cor. Não inclui bobina de 5 kg.</p>
    {feedback && <p role="status" className="mt-4 text-sm">{feedback}</p>}
    <button disabled={busy} type="submit" className="mt-5 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Cadastrando..." : "Cadastrar produto como inativo"}</button>
  </form>;
}
