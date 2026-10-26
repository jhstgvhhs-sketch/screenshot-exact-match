import { DeleteProductButton } from "./DeleteProductButton";
import { LowStockSettings, lowStockQuery } from "./LowStockSettings";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, type Product, productImage, totalStock } from "@/lib/catalog";
import { brl } from "@/lib/store";
import { ProductEditor, DraftProductEditor } from "./CatalogEditors";
import { Panel, Pager, QueryState, Status, field, action } from "./AdminUi";
type AdminProduct = Product & { active: boolean };
export function CatalogPage({
  stockOnly = false,
  onAdd,
}: {
  stockOnly?: boolean;
  onAdd: () => void;
}) {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const lowSettings = useQuery({ ...lowStockQuery(), enabled: stockOnly });
  const low = lowSettings.data?.low_stock_limit;
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const categories = useQuery(categoriesQuery());
  const query = useQuery({
    queryKey: ["admin-catalog", term, category, material, active, page],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*,categories(name,slug),product_variants(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 25, page * 25 + 24);
      if (term) q = q.ilike("name", `%${term.replaceAll("%", "").replaceAll("_", "")}%`);
      if (category) q = q.eq("category_id", category);
      if (material) q = q.eq("material", material);
      if (active !== "all") q = q.eq("active", active === "true");
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data as unknown as AdminProduct[], count: count ?? 0 };
    },
  });
  function refresh() {
    ["admin-catalog", "products", "product", "categories", "admin-inactive-products"].forEach(
      (key) => void client.invalidateQueries({ queryKey: [key] }),
    );
  }
  const product = query.data?.rows.find((p) => p.id === selected);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Buscar produtos"
          className={field + " max-w-xs"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto"
        />
        <select
          aria-label="Categoria"
          className={field + " max-w-48"}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todas as categorias</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Material"
          value={material}
          className={field + " max-w-40"}
          onChange={(e) => {
            setMaterial(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos os materiais</option>
          <option>PLA</option>
          <option>PETG</option>
        </select>
        <select
          aria-label="Publicação"
          value={active}
          className={field + " max-w-40"}
          onChange={(e) => {
            setActive(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button className={action + " bg-primary text-primary-foreground"} onClick={onAdd}>
          Adicionar produto
        </button>
      </div>
      {stockOnly && <LowStockSettings />}
      <QueryState
        loading={query.isLoading}
        error={query.isError}
        empty={query.data?.count === 0}
        retry={() => void query.refetch()}
      />
      {query.data && !query.isError && (
        <Panel title={stockOnly ? "Estoque por variante" : "Catálogo de produtos"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {[
                    "Produto",
                    "Categoria",
                    "Material",
                    "Preço",
                    "Opções",
                    "Estoque",
                    "Status",
                    "Ações",
                  ].map((t) => (
                    <th key={t} className="pb-4 pr-3">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="flex items-center gap-3 py-4 pr-3">
                      <img
                        className="h-12 w-12 rounded-lg object-cover"
                        src={productImage(p)}
                        alt=""
                      />
                      <span className="font-semibold">{p.name}</span>
                    </td>
                    <td>{p.categories?.name || "Sem categoria"}</td>
                    <td>{p.material || "—"}</td>
                    <td className="whitespace-nowrap pr-3">{brl(p.price)}</td>
                    <td>{p.product_variants.length}</td>
                    <td>{totalStock(p)}</td>
                    <td>
                      <Status>{p.active ? "Ativo" : "Inativo"}</Status>
                    </td>
                    <td>
                      <button
                        className={action}
                        onClick={() => setSelected(selected === p.id ? null : p.id)}
                      >
                        {selected === p.id ? "Fechar" : "Editar"}
                      </button>
                      <DeleteProductButton
                        product={p}
                        onDeleted={() => {
                          if (selected === p.id) setSelected(null);
                          if (page > 0 && query.data.rows.length === 1) setPage(page - 1);
                          refresh();
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} count={query.data.count} onChange={setPage} />
        </Panel>
      )}
      {stockOnly &&
        query.data?.rows.map((p) => (
          <Panel key={p.id} title={p.name}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[...p.product_variants]
                .sort((a, b) => a.sort - b.sort)
                .map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-white/20"
                        style={{ backgroundColor: v.color_hex || "#777" }}
                      />
                      {v.color}
                    </span>
                    <span>
                      {v.stock} ·{" "}
                      <span
                        className={
                          low !== undefined && v.stock <= low
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {v.stock === 0
                          ? "Sem estoque"
                          : low !== undefined && v.stock <= low
                            ? "Estoque baixo"
                            : "Em estoque"}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
            <button className={action + " mt-4"} onClick={() => setSelected(p.id)}>
              Editar estoque e variantes
            </button>
          </Panel>
        ))}
      {product && (
        <div className="space-y-4" key={product.id}>
          {product.active ? (
            <ProductEditor
              key={JSON.stringify(product)}
              product={product}
              initiallyEditing
              onSaved={refresh}
            />
          ) : (
            <DraftProductEditor key={JSON.stringify(product)} product={product} onSaved={refresh} />
          )}
          <VariantAdd product={product} onSaved={refresh} />
          <ProductActivation product={product} onSaved={refresh} />
        </div>
      )}
    </div>
  );
}
function ProductActivation({ product, onSaved }: { product: AdminProduct; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function deactivate() {
    if (
      !window.confirm("Desativar este produto no catálogo? Pedidos e variantes serão preservados.")
    )
      return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ active: false })
        .eq("id", product.id)
        .select("id")
        .single();
      if (error) throw error;
      setFeedback("Produto desativado.");
      onSaved();
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return product.active ? (
    <div>
      <button className={action} disabled={busy} onClick={() => void deactivate()}>
        Desativar produto
      </button>
      {feedback && (
        <p role="status" className="mt-2 text-sm">
          {feedback}
        </p>
      )}
    </div>
  ) : null;
}
function VariantAdd({ product, onSaved }: { product: AdminProduct; onSaved: () => void }) {
  const [color, setColor] = useState("");
  const [sku, setSku] = useState("");
  const [hex, setHex] = useState("#888888");
  const [stock, setStock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (
      product.product_variants.some((v) => v.color.toLowerCase() === color.trim().toLowerCase())
    ) {
      setFeedback("Essa opção já existe neste produto.");
      return;
    }
    if (!window.confirm(`Adicionar a cor ${color.trim()} com ${stock} unidade(s)?`)) return;
    setBusy(true);
    try {
      const sort = Math.max(-1, ...product.product_variants.map((v) => v.sort)) + 1;
      const { error } = await supabase
        .from("product_variants")
        .insert({
          product_id: product.id,
          color: color.trim(),
          sku: sku.trim(),
          color_hex: hex,
          stock,
          sort,
        })
        .select("id")
        .single();
      if (error) throw error;
      setFeedback("Opção adicionada. Edite o produto para informar a imagem.");
      setColor("");
      setSku("");
      onSaved();
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-border p-5">
      <summary className="cursor-pointer font-semibold">Adicionar {product.categories?.slug === "filamentos" ? "uma cor" : "uma opção / modelo"} a {product.name}</summary>
      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nome da opção / cor
          <input
            required
            maxLength={100}
            className={field + " mt-1"}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label className="text-sm">
          SKU único
          <input
            required
            maxLength={100}
            className={field + " mt-1"}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Identificação visual
          <input
            type="color"
            value={hex}
            className={field + " mt-1 h-11"}
            onChange={(e) => setHex(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Estoque inicial
          <input
            required
            type="number"
            min={0}
            step={1}
            value={stock}
            className={field + " mt-1"}
            onChange={(e) => setStock(e.target.valueAsNumber)}
          />
        </label>
        <button disabled={busy} className={action} type="submit">
          Salvar nova opção
        </button>
      </form>
      {feedback && (
        <p role="status" className="mt-3 text-sm">
          {feedback}
        </p>
      )}
    </details>
  );
}
