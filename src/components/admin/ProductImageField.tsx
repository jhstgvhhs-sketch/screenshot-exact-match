import { useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ProductImageField({
  label,
  value,
  onChange,
  disabled,
  onUploadingChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  onUploadingChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file || pending.current || disabled) return;
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (!extensions[file.type] || !file.size || file.size > 5 * 1024 * 1024) {
      setMessage("Selecione JPG, PNG ou WebP de até 5 MB.");
      return;
    }
    pending.current = true;
    setBusy(true);
    onUploadingChange(true);
    setMessage("");
    try {
      const path = `products/${crypto.randomUUID()}.${extensions[file.type]}`;
      const bucket = supabase.storage.from("store-assets");
      const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange(bucket.getPublicUrl(path).data.publicUrl);
      setMessage("Foto enviada. Salve o produto para confirmar a alteração.");
    } catch (error) {
      setMessage(
        "Não foi possível enviar a foto. " +
          (error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Tente novamente."),
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onUploadingChange(false);
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <label className="block text-sm font-semibold">
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={(event) => void upload(event)}
          className="mt-2 block w-full min-w-0 text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB</p>
      {value && (
        <img src={value} alt={label} className="h-28 w-28 rounded bg-background object-contain" />
      )}
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          Usar link da imagem
        </summary>
        <input
          aria-label={`Link: ${label}`}
          type="url"
          value={value}
          disabled={disabled || busy}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-lg border border-input bg-background p-2 text-sm"
        />
      </details>
      {(busy || message) && (
        <p role="status" className="text-sm">
          {busy ? "Enviando foto..." : message}
        </p>
      )}
    </div>
  );
}
