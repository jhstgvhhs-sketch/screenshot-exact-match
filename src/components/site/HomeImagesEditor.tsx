import { useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero.jpg";
import {
  DEFAULT_HOME_COPY,
  HOME_COPY_FIELDS,
  MAX_HOME_IMAGES,
  validateHomeImages,
  type HomeImage,
} from "@/lib/home-images";

export function HomeImagesEditor({
  current,
  onSaved,
}: {
  current: HomeImage[] | null;
  onSaved: () => void;
}) {
  const [images, setImages] = useState<HomeImage[] | null>(current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const edit = (next: HomeImage[] | null) => {
    setImages(next);
    setDirty(true);
    setMessage("");
  };
  async function upload(event: ChangeEvent<HTMLInputElement>, replace?: number) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Envie JPG, PNG ou WebP de até 5 MB.");
      input.value = "";
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (replace === undefined && (images?.length ?? 0) >= MAX_HOME_IMAGES)
        throw new Error(`Use até ${MAX_HOME_IMAGES} imagens.`);
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `homepage/${crypto.randomUUID()}.${ext}`;
      const bucket = supabase.storage.from("store-assets");
      const { error } = await bucket.upload(path, file, { contentType: file.type });
      if (error) throw error;
      const next = {
        url: bucket.getPublicUrl(path).data.publicUrl,
        alt: file.name.replace(/\.[^.]+$/, "").slice(0, 180) || "Imagem da 3DFLEX",
      };
      edit(
        replace === undefined
          ? [...(images ?? []), next]
          : (images ?? []).map((image, i) => (i === replace ? { ...image, ...next } : image)),
      );
      setMessage(
        "Imagem carregada. Clique em Salvar imagens da página inicial para exibi-la no site.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const values = images === null ? null : validateHomeImages(images);
      const { data, error } = await (supabase as unknown as SupabaseClient)
        .from("store_settings")
        .update({ homepage_images: values, updated_at: new Date().toISOString() })
        .eq("id", "main")
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou a atualização.");
      setDirty(false);
      setMessage("Imagens da página inicial salvas.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar as imagens.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">Imagens da página inicial</h2>
      <p className="text-sm text-muted-foreground">
        Controle a imagem grande no topo da loja. Adicione até {MAX_HOME_IMAGES} imagens; o
        carrossel passa automaticamente a cada 7 segundos e permite avançar ou voltar pelas setas. O
        texto de cada imagem aparece sobre ela e pode ser editado nos campos abaixo. Use fotos sem
        texto e mantenha os elementos importantes no centro. Recomendado: 1568 × 987 px, JPG ou WebP
        até 5 MB. As imagens aparecem inteiras, sem sombreado.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        {images === null ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p>Imagem original do site</p>
            <img
              src={hero}
              alt="Imagem original da página inicial"
              className="max-h-48 w-full object-contain"
            />
            <button type="button" className="text-destructive underline" onClick={() => edit([])}>
              Remover imagem original do site
            </button>
          </div>
        ) : images.length === 0 ? (
          <p>Nenhuma imagem selecionada. Ao salvar, a imagem principal será removida.</p>
        ) : (
          images.map((image, index) => (
            <div key={`${index}-${image.url}`} className="space-y-3 rounded-lg border p-4">
              <img src={image.url} alt={image.alt} className="max-h-48 w-full object-contain" />
              <label className="block text-sm">
                Descrição da imagem {index + 1}
                <input
                  className="mt-1 w-full rounded-lg border bg-background p-3"
                  value={image.alt}
                  maxLength={180}
                  onChange={(event) =>
                    edit(
                      images.map((value, i) =>
                        i === index ? { ...value, alt: event.target.value } : value,
                      ),
                    )
                  }
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Texto exclusivo desta imagem. Deixe um campo vazio para ocultá-lo.
              </p>
              {HOME_COPY_FIELDS.map((field) => (
                <label key={field.key} className="block text-sm">
                  {field.label} da imagem {index + 1}
                  <textarea
                    rows={field.key === "description" ? 3 : 2}
                    maxLength={field.limit}
                    className="mt-1 w-full rounded-lg border bg-background p-3"
                    value={image[field.key] ?? DEFAULT_HOME_COPY[field.key]}
                    onChange={(event) =>
                      edit(
                        images.map((value, i) =>
                          i === index ? { ...value, [field.key]: event.target.value } : value,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="cursor-pointer text-primary underline">
                  Trocar imagem {index + 1}
                  <input
                    className="sr-only"
                    aria-label={`Trocar imagem ${index + 1}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void upload(event, index)}
                  />
                </label>
                <button
                  type="button"
                  disabled={index === 0}
                  className="underline disabled:opacity-40"
                  onClick={() => {
                    const next = [...images];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    edit(next);
                  }}
                >
                  Mover imagem {index + 1} para antes
                </button>
                <button
                  type="button"
                  className="text-destructive underline"
                  onClick={() => edit(images.filter((_, i) => i !== index))}
                >
                  Apagar imagem {index + 1} do site
                </button>
              </div>
            </div>
          ))
        )}
        <label className="block text-sm font-semibold">
          {images === null ? "Trocar imagem original / enviar nova imagem" : "Adicionar imagem"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || (images?.length ?? 0) >= MAX_HOME_IMAGES}
            onChange={(event) => void upload(event)}
            className="mt-2 block w-full text-sm"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => void save()}
            className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Aguarde…" : "Salvar imagens da página inicial"}
          </button>
          <button type="button" className="text-sm underline" onClick={() => edit(null)}>
            Restaurar imagem original
          </button>
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Apagar retira a imagem da vitrine após salvar. O arquivo permanece no armazenamento,
        evitando excluir imagens usadas em outros locais.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
