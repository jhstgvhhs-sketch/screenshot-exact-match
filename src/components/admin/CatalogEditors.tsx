import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, type Product } from "@/lib/catalog";
export function ProductEditor({
  product,
  onSaved,
  initiallyEditing = false,
}: {
  product: Product;
  onSaved: () => void;
  initiallyEditing?: boolean;
}) {
  const [editing, setEditing] = useState(initiallyEditing);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{product.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((x) => !x)}
            className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary"
          >
            {editing ? "Fechar edição" : "Editar produto"}
          </button>
        </div>
      </div>
      {editing && <CatalogEditFields key={product.id} product={product} onSaved={onSaved} />}
    </div>
  );
}

type EditableProduct = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  brand: string | null;
  material: string | null;
  weight: string | null;
  diameter: string | null;
  description: string | null;
  price: number;
  images: string[];
  product_variants: {
    id: string;
    color: string;
    color_hex: string | null;
    sku: string;
    stock: number;
    sort: number;
  }[];
};

export function CatalogEditFields({
  product,
  onSaved,
}: {
  product: EditableProduct;
  onSaved: () => void;
}) {
  const { data: categories = [] } = useQuery(categoriesQuery());
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const variants = [...product.product_variants].sort((a, b) => a.sort - b.sort);
  const [fields, setFields] = useState({
    name: product.name,
    slug: product.slug,
    brand: product.brand ?? "",
    material: product.material ?? "",
    weight: product.weight ?? "",
    diameter: product.diameter ?? "",
    description: product.description ?? "",
    price: String(product.price),
  });
  const [images, setImages] = useState<string[]>(() =>
    Array.from({ length: variants.length + 1 }, (_, i) => product.images?.[i] ?? ""),
  );
  const [variantFields, setVariantFields] = useState<
    Record<string, { color: string; color_hex: string; sku: string; stock: string }>
  >(() =>
    Object.fromEntries(
      variants.map((v) => [
        v.id,
        { color: v.color, color_hex: v.color_hex ?? "", sku: v.sku, stock: String(v.stock) },
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const setField = (key: keyof typeof fields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));
  const setVariant = (id: string, key: "color" | "color_hex" | "sku" | "stock", value: string) =>
    setVariantFields((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  const setImage = (index: number, value: string) =>
    setImages((prev) => prev.map((s, i) => (i === index ? value : s)));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !window.confirm(
        "Confirmar as alterações deste produto? As informações serão atualizadas na loja após salvar.",
      )
    )
      return;
    const price = Number(fields.price.replace(",", "."));
    if (
      !fields.name.trim() ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug.trim()) ||
      !/^\d+([.,]\d{1,2})?$/.test(fields.price.trim()) ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setFeedback("Revise o nome, identificador e preço.");
      return;
    }
    if (
      variants.some(
        (v) =>
          !variantFields[v.id].color.trim() ||
          !variantFields[v.id].sku.trim() ||
          !/^\d+$/.test(variantFields[v.id].stock) ||
          !Number.isSafeInteger(Number(variantFields[v.id].stock)),
      )
    ) {
      setFeedback("Cada cor precisa de nome, SKU e estoque inteiro válido.");
      return;
    }
    const colorNames = variants.map((v) => variantFields[v.id].color.trim().toLowerCase());
    const skus = variants.map((v) => variantFields[v.id].sku.trim().toLowerCase());
    if (new Set(colorNames).size !== colorNames.length || new Set(skus).size !== skus.length) {
      setFeedback("Cores e SKUs não podem ser repetidos neste produto.");
      return;
    }
    const validImage = (s: string) => {
      try {
        return new URL(s).protocol === "https:";
      } catch {
        return false;
      }
    };
    if (images.some((s) => s.trim() && !validImage(s.trim()))) {
      setFeedback("As fotos precisam ter URLs HTTPS válidas.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const { data, error } = await supabase
        .from("products")
        .update({
          name: fields.name.trim(),
          slug: fields.slug.trim(),
          brand: fields.brand.trim() || null,
          material: fields.material.trim() || null,
          weight: fields.weight.trim() || null,
          diameter: fields.diameter.trim() || null,
          description: fields.description.trim() || null,
          price,
          category_id: categoryId || null,
          images: images.map((s) => s.trim()),
        })
        .eq("id", product.id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou a edição do produto.");
      for (const v of variants) {
        const f = variantFields[v.id];
        if (
          f.color !== v.color ||
          f.color_hex !== (v.color_hex ?? "") ||
          f.sku !== v.sku ||
          Number(f.stock) !== v.stock
        ) {
          const { data: saved, error: variantError } = await supabase
            .from("product_variants")
            .update({
              color: f.color.trim(),
              color_hex: f.color_hex.trim() || null,
              sku: f.sku.trim(),
              stock: Number(f.stock),
            })
            .eq("id", v.id)
            .eq("product_id", product.id)
            .select("id")
            .single();
          if (variantError) throw variantError;
          if (!saved) throw new Error("O banco não confirmou a cor " + v.color);
        }
      }
      setFeedback("Produto atualizado sem excluir o cadastro ou suas cores.");
      onSaved();
    } catch (err) {
      setFeedback(
        (err instanceof Error ? err.message : "Erro ao editar.") +
          " Alterações anteriores podem ter sido salvas; atualize a página para conferir.",
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  }
  async function removeVariant(v: EditableProduct["product_variants"][number], index: number) {
    if (saving) return;
    if (variants.length <= 1) {
      setFeedback("Não é possível excluir a última cor. Mantenha pelo menos uma variante.");
      return;
    }
    if (
      !window.confirm(
        `Excluir somente a cor "${v.color}" de "${product.name}"? As demais cores serão preservadas. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setSaving(true);
    setFeedback("");
    try {
      const { data: linked, error: linkedError } = await supabase
        .from("order_items")
        .select("id")
        .eq("variant_id", v.id)
        .limit(1);
      if (linkedError) throw linkedError;
      if (linked?.length)
        throw new Error(
          "Esta cor está vinculada a um pedido e não pode ser excluída. Preserve o histórico de vendas.",
        );
      const { data: removed, error: removeError } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", v.id)
        .eq("product_id", product.id)
        .select("id")
        .single();
      if (removeError) throw removeError;
      if (!removed) throw new Error("O banco não confirmou a exclusão desta cor.");
      const nextImages = [...(product.images ?? [])];
      if (index + 1 < nextImages.length) nextImages.splice(index + 1, 1);
      const { error: imageError } = await supabase
        .from("products")
        .update({ images: nextImages })
        .eq("id", product.id);
      if (imageError)
        throw new Error(
          "A cor foi excluída, mas não foi possível reorganizar as imagens: " + imageError.message,
        );
      setFeedback(`Cor "${v.color}" excluída. As outras cores foram mantidas.`);
      onSaved();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível excluir esta cor.");
      onSaved();
    } finally {
      setSaving(false);
    }
  }
  const inputClass = "mt-1 w-full rounded-lg border border-input bg-background p-2";
  return (
    <form onSubmit={save} className="mt-5 space-y-4 border-t border-border pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["name", "slug", "brand", "material", "weight", "diameter", "price"] as const).map(
          (key) => (
            <label key={key} className="text-sm font-semibold">
              {
                {
                  name: "Nome",
                  slug: "Identificador / URL",
                  brand: "Marca",
                  material: "Material",
                  weight: "Peso",
                  diameter: "Diâmetro",
                  price: "Preço (R$)",
                }[key]
              }
              <input
                required={key === "name" || key === "slug" || key === "price"}
                value={fields[key]}
                onChange={(e) => setField(key, e.target.value)}
                className={inputClass}
              />
            </label>
          ),
        )}
      </div>
      <label className="block text-sm font-semibold">
        Categoria
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">Sem categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Descrição
        <textarea
          rows={3}
          value={fields.description}
          onChange={(e) => setField("description", e.target.value)}
          className={inputClass}
        />
      </label>
      <h4 className="font-semibold">Imagens do produto</h4>
      <label className="block text-sm">
        Foto principal (URL HTTPS)
        <input
          type="url"
          value={images[0]}
          onChange={(e) => setImage(0, e.target.value)}
          className={inputClass}
        />
      </label>
      <h4 className="font-semibold">Editar cores, estoque e fotos</h4>
      <p className="text-xs text-muted-foreground">
        As cores existentes são editadas no próprio registro, sem excluir variantes. A imagem de
        cada cor segue a ordem original das variantes.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {variants.map((v, i) => (
          <div key={v.id} className="rounded-lg border border-border p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-semibold">{v.color}</span>
              <button
                type="button"
                disabled={saving || variants.length <= 1}
                onClick={() => void removeVariant(v, i)}
                className="rounded-lg border border-destructive px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                aria-label={`Excluir somente a cor ${v.color}`}
              >
                Excluir esta cor
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["color", "sku", "stock", "color_hex"] as const).map((key) => (
                <label key={key} className="text-xs font-semibold">
                  {
                    {
                      color: "Nome da cor",
                      sku: "SKU",
                      stock: "Estoque",
                      color_hex: "Cor hexadecimal (opcional)",
                    }[key]
                  }
                  <input
                    value={variantFields[v.id][key]}
                    onChange={(e) => setVariant(v.id, key, e.target.value)}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 block text-xs font-semibold">
              Foto desta cor (URL HTTPS)
              <input
                type="url"
                value={images[i + 1]}
                onChange={(e) => setImage(i + 1, e.target.value)}
                className={inputClass}
              />
            </label>
            {images[i + 1] && (
              <img
                src={images[i + 1]}
                alt={variantFields[v.id].color}
                className="mt-2 size-20 rounded border border-border object-cover"
              />
            )}
          </div>
        ))}
      </div>
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
      <button
        disabled={saving}
        type="submit"
        className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Confirmar e salvar alterações"}
      </button>
    </form>
  );
}

const PETG_COLORS = [
  "Preto",
  "Branco",
  "Translúcido Amarelo",
  "Translúcido Azul",
  "Translúcido Vermelho",
  "Prata",
  "Transparente",
  "Marrom",
  "Madeira",
  "Fosco Branco",
  "Fosforescente Rainbow",
  "Lavanda",
  "Fluorescente Roxo",
  "Fibra de Carbono",
  "Translúcido Verde",
  "Roxo",
  "Branco PCV Outdoor",
  "Translúcido Branco",
  "Cool Grey",
  "Green Olive",
];

export function NewProductForm({
  categories,
  onSaved,
}: {
  categories: CategoryItem[];
  onSaved: () => void;
}) {
  const [material, setMaterial] = useState("PETG");
  const [brand, setBrand] = useState("MasterPrint");
  const [name, setName] = useState("Filamento PETG MasterPrint 1kg — 1,75mm");
  const [slug, setSlug] = useState("filamento-petg-masterprint-1kg");
  const [price, setPrice] = useState("69,90");
  const [description, setDescription] = useState(
    "Filamento PETG MasterPrint para impressão 3D. Bobina de 1 kg, diâmetro de 1,75 mm.",
  );
  const [colors, setColors] = useState(PETG_COLORS.join("\n"));
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(price.replace(",", "."));
    const names = [
      ...new Set(
        colors
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    if (
      !name.trim() ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      !/^\d+([.,]\d{1,2})?$/.test(price.trim()) ||
      value <= 0 ||
      !names.length
    ) {
      setFeedback("Confira nome, identificador, preço e cores.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) throw new Error("Já existe um produto com este identificador.");
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          slug,
          price: value,
          brand: brand.trim() || null,
          material: material.trim() || null,
          weight: "1kg",
          diameter: "1,75mm",
          description: description.trim(),
          images: imageUrl.trim() ? [imageUrl.trim()] : [],
          category_id: categoryId || null,
          active: false,
          featured: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!product) throw new Error("O banco não confirmou o cadastro do produto.");
      const { error: variantsError } = await supabase.from("product_variants").insert(
        names.map((color, index) => ({
          product_id: product.id,
          color,
          sku: "MP-PETG-" + product.id.slice(0, 8) + "-" + (index + 1).toString().padStart(2, "0"),
          stock: 1,
          sort: index,
        })),
      );
      if (variantsError)
        throw new Error(
          "Produto criado como inativo, mas as cores não foram salvas: " + variantsError.message,
        );
      setFeedback(
        "Produto e " +
          names.length +
          " cores cadastrados como INATIVOS. A publicação na loja será feita em uma etapa separada.",
      );
      onSaved();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível cadastrar o produto.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={create} className="mt-10 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">Cadastrar novo produto</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Novo produto é criado inativo, para você revisar antes de disponibilizar na loja.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          Identificador (URL)
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          Preço (R$)
          <input
            required
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          URL da foto principal (opcional)
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Material
          <input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          Marca
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold">
        Categoria
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-input bg-background p-3"
        >
          <option value="">Sem categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Descrição
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2 w-full rounded-lg border border-input bg-background p-3"
        />
      </label>
      <label className="mt-4 block text-sm font-semibold">
        Cores (uma por linha)
        <textarea
          required
          rows={9}
          value={colors}
          onChange={(e) => setColors(e.target.value)}
          className="mt-2 w-full rounded-lg border border-input bg-background p-3"
        />
      </label>
      <p className="mt-2 text-sm text-muted-foreground">
        Estoque inicial: 1 unidade por cor. Não inclui bobina de 5 kg.
      </p>
      {feedback && (
        <p role="status" className="mt-4 text-sm">
          {feedback}
        </p>
      )}
      <button
        disabled={busy}
        type="submit"
        className="mt-5 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Cadastrando..." : "Cadastrar produto como inativo"}
      </button>
    </form>
  );
}

export function DraftProductEditor({
  product,
  onSaved,
}: {
  product: {
    id: string;
    name: string;
    images: string[];
    product_variants: { id: string; color: string; sort: number }[];
  };
  onSaved: () => void;
}) {
  const variants = [...product.product_variants].sort((a, b) => a.sort - b.sort);
  const [mainImage, setMainImage] = useState(product.images?.[0] ?? "");
  const [colorImages, setColorImages] = useState<Record<string, string>>(() =>
    Object.fromEntries(variants.map((v, i) => [v.id, product.images?.[i + 1] ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const validUrl = (s: string) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:";
    } catch {
      return false;
    }
  };
  async function save(publish: boolean) {
    if (
      !window.confirm(
        publish
          ? "Confirmar a publicação deste produto na loja?"
          : "Confirmar o salvamento das fotos deste produto?",
      )
    )
      return;
    const urls = [mainImage.trim(), ...variants.map((v) => (colorImages[v.id] ?? "").trim())];
    if (urls.some((u) => u && !validUrl(u))) {
      setFeedback("Use links de imagens HTTPS válidos.");
      return;
    }
    if (publish && urls.some((u) => !u)) {
      setFeedback("Adicione a foto principal e uma foto para cada cor antes de publicar.");
      return;
    }
    // Positional mapping: images[0] is main image, images[i+1] follows variant sort.
    const images = publish ? urls : urls.slice(0, urls.findLastIndex(Boolean) + 1);
    setBusy(true);
    setFeedback("");
    try {
      const { data, error } = await supabase
        .from("products")
        .update({ images, active: publish })
        .eq("id", product.id)
        .eq("active", false)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Não foi possível confirmar a atualização.");
      setFeedback(publish ? "Produto publicado na loja." : "Fotos salvas no banco.");
      onSaved();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-lg font-bold">{product.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Inativo — ainda não aparece no catálogo público.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Foto principal (URL HTTPS)
        <input
          type="url"
          value={mainImage}
          onChange={(e) => setMainImage(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-lg border border-input bg-background p-3"
        />
      </label>
      <p className="mt-4 text-sm font-semibold">Fotos por cor (links HTTPS)</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {variants.map((v) => (
          <label key={v.id} className="text-sm">
            {v.color}
            <input
              type="url"
              value={colorImages[v.id] ?? ""}
              onChange={(e) => setColorImages((prev) => ({ ...prev, [v.id]: e.target.value }))}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-input bg-background p-2"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Nesta etapa, as imagens são cadastradas por URL. O envio de arquivos e a troca automática de
        imagem ao selecionar uma cor serão implementados separadamente.
      </p>
      {feedback && (
        <p role="status" className="mt-4 text-sm">
          {feedback}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="rounded-lg border border-input px-5 py-3 font-semibold disabled:opacity-50"
        >
          {busy ? "Aguarde..." : "Salvar fotos"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(true)}
          className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          Publicar produto
        </button>
      </div>
      <details className="mt-5">
        <summary className="cursor-pointer font-semibold text-primary">
          Editar informações, preço, cores e estoque
        </summary>
        <CatalogEditFields
          product={{
            ...(product as unknown as EditableProduct),
            price: Number((product as unknown as EditableProduct).price),
          }}
          onSaved={onSaved}
        />
      </details>
    </div>
  );
}

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  sort: number;
  description: string | null;
};
const DEFAULT_CATEGORIES = [
  {
    name: "Filamentos",
    slug: "filamentos",
    description: "Filamentos PLA, PETG e outros materiais para impressão 3D",
  },
  { name: "Impressoras", slug: "impressoras", description: "Impressoras 3D e equipamentos" },
  {
    name: "Acessórios",
    slug: "acessorios",
    description: "Peças, ferramentas e acessórios para impressão 3D",
  },
];
export function CategoryManager({
  categories,
  onSaved,
}: {
  categories: CategoryItem[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function insertCategories(items: { name: string; slug: string; description?: string }[]) {
    setBusy(true);
    setFeedback("");
    try {
      let created = 0;
      for (const item of items) {
        if (categories.some((c) => c.slug === item.slug)) continue;
        const { error } = await supabase.from("categories").insert({
          name: item.name,
          slug: item.slug,
          description: item.description ?? null,
          sort: categories.length + created,
        });
        if (error) throw error;
        created++;
      }
      setFeedback(
        created ? created + " categoria(s) criada(s) no banco." : "Essas categorias já existem.",
      );
      setName("");
      setSlug("");
      onSaved();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Não foi possível salvar as categorias.");
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">Categorias da loja</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Organize seus produtos em Filamentos, Impressoras e Acessórios. Nenhum produto existente
        será excluído.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span key={cat.id} className="rounded-lg border border-border px-3 py-2 text-sm">
            {cat.name}
          </span>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void insertCategories(DEFAULT_CATEGORIES)}
        className="mt-4 rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Salvando..." : "Criar categorias padrão"}
      </button>
      <form
        className="mt-5 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            setFeedback("Preencha o nome e um identificador válido.");
            return;
          }
          void insertCategories([{ name: name.trim(), slug }]);
        }}
      >
        <input
          aria-label="Nome da categoria"
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-input bg-background p-3"
        />
        <input
          aria-label="Identificador da categoria"
          placeholder="identificador-sem-acentos"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded-lg border border-input bg-background p-3"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary disabled:opacity-50"
        >
          Adicionar categoria
        </button>
      </form>
      {feedback && (
        <p role="status" className="mt-3 text-sm">
          {feedback}
        </p>
      )}
    </section>
  );
}
