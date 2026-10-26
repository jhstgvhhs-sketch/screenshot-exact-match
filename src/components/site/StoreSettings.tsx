import { useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HomeImagesEditor } from "./HomeImagesEditor";
import type { HomeImage } from "@/lib/home-images";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = {
 homepage_images?: HomeImage[] | null;
 id: string; business_name: string; legal_name: string; cnpj: string; whatsapp: string;
 phone: string; email: string; address: string; about: string; logo_url: string; banner_url: string;
};
const initial: StoreSettings = { id: "main", business_name: "3DFLEX", legal_name: "", cnpj: "", whatsapp: "", phone: "", email: "", address: "", about: "", logo_url: "", banner_url: "" };
const settingsTable = () => (supabase as unknown as { from: (table: string) => any }).from("store_settings");
export function useStoreSettings() {
 return useQuery<StoreSettings>({
   queryKey: ["store-settings"],
   queryFn: async () => {
     const { data, error } = await settingsTable().select("*").eq("id","main").maybeSingle();
     if (error) throw error;
     return { ...initial, ...(data ?? {}) };
   },
   staleTime: 60000,
 });
}
const labels: { key: Exclude<keyof StoreSettings, "homepage_images">; label: string; placeholder?: string }[] = [
 { key: "business_name", label: "Nome comercial" },
 { key: "legal_name", label: "Razão social" },
 { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
 { key: "whatsapp", label: "WhatsApp do checkout (cartão) e atendimento", placeholder: "71999999999" },
 { key: "phone", label: "Telefone" },
 { key: "email", label: "E-mail comercial" },
 { key: "address", label: "Endereço comercial completo" },
 { key: "logo_url", label: "URL da logo" },
 { key: "banner_url", label: "URL do banner" },
];
export function StoreSettingsEditor() {
 const { data, isLoading, isError } = useStoreSettings();
 const client = useQueryClient();
 if (isLoading) return <p className="mt-8">Carregando dados da loja...</p>;
 if (isError) return <p className="mt-8 text-destructive">Não foi possível ler os dados da loja. Verifique se a migração foi aplicada no Lovable Cloud.</p>;
 return <><HomeImagesEditor key={JSON.stringify(data?.homepage_images)} current={data?.homepage_images ?? null} onSaved={() => void client.invalidateQueries({ queryKey: ["store-settings"] })}/><StoreSettingsForm key={JSON.stringify(data)} current={data ?? initial} onSaved={() => void client.invalidateQueries({ queryKey: ["store-settings"] })} /></>;
}
function StoreSettingsForm({ current, onSaved }: { current: StoreSettings; onSaved: () => void }) {
 const [fields, setFields] = useState(current);
 const [busy, setBusy] = useState(false);
 const [uploading, setUploading] = useState("");
 const [message, setMessage] = useState("");
 const set = (key: keyof StoreSettings, value: string) => setFields(prev => ({ ...prev, [key]: value }));
 async function upload(e: ChangeEvent<HTMLInputElement>, field: "logo_url" | "banner_url") {
   const file = e.target.files?.[0]; if (!file) return;
   if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5*1024*1024) { setMessage("Envie JPG, PNG ou WebP de até 5 MB."); return; }
   setUploading(field); setMessage("");
   try {
     const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
     const filePath = `${field}/${crypto.randomUUID()}.${extension}`;
     const { error } = await supabase.storage.from("store-assets").upload(filePath, file, { contentType: file.type });
     if (error) throw error;
     const { data } = supabase.storage.from("store-assets").getPublicUrl(filePath);
     set(field, data.publicUrl);
     setMessage("Imagem enviada. Clique em Salvar dados da loja para publicá-la.");
   } catch (err) { setMessage(err instanceof Error ? err.message : "Falha no envio da imagem."); }
   finally { setUploading(""); e.target.value = ""; }
 }
 async function save(e: FormEvent<HTMLFormElement>) {
   e.preventDefault();
   if (!window.confirm("Confirmar as alterações dos dados da loja? As informações salvas aparecerão no site.")) return;
   setBusy(true); setMessage("");
   try {
     const contactDigits = fields.whatsapp.replace(/\D/g, "");
     if (contactDigits && !/^(?:\d{10,11}|55\d{10,11})$/.test(contactDigits)) throw new Error("Informe um WhatsApp válido com DDD (ex.: 71999999999).");
     for (const url of [fields.logo_url, fields.banner_url]) if (url.trim() && !/^https:\/\//i.test(url.trim())) throw new Error("As imagens precisam usar URLs HTTPS.");
     const { id, homepage_images: _homepageImages, ...values } = fields;
     const { data, error } = await settingsTable().upsert({ id: "main", ...values }, { onConflict: "id" }).select("id").single();
     if (error) throw error;
     if (!data) throw new Error("O banco não confirmou a atualização.");
     setMessage("Dados da loja atualizados.");
     onSaved();
   } catch (err) { setMessage(err instanceof Error ? err.message : "Falha ao salvar."); }
   finally { setBusy(false); }
 }
 return <form onSubmit={save} className="mt-10 space-y-5 rounded-xl border border-border bg-card p-5">
   <h2 className="text-xl font-bold">Dados da loja</h2>
   {(!fields.legal_name.trim() || !fields.cnpj.trim() || !fields.address.trim() || (!fields.email.trim() && !fields.whatsapp.trim())) && <div role="status" className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm"><p className="font-bold text-foreground">Complete a identificação comercial para transmitir confiança.</p><p className="mt-1 text-muted-foreground">Informe dados reais: razão social, CNPJ, endereço comercial e pelo menos um canal de atendimento. Essas informações aparecem no rodapé e nas páginas de políticas. Não use dados de terceiros.</p></div>}
   <p className="text-sm text-muted-foreground">Atualize as informações que aparecem no rodapé. Campos vazios não serão publicados. Não use dados de outra empresa.</p>
   <p className="text-sm text-muted-foreground">O campo WhatsApp do checkout define para qual número o cliente será direcionado ao escolher cartão de crédito. O mesmo número aparece no rodapé. Informe DDD e número; o código 55 é opcional. A alteração passa a valer após salvar, sem nova publicação. Se estiver vazio, será usada a configuração anterior do ambiente, caso exista.</p>
   <div className="grid gap-4 md:grid-cols-2">
    {labels.map(({ key,label,placeholder }) => <label key={key} className="block text-sm font-semibold">{label}
      <input type={key === "email" ? "email" : "text"} placeholder={placeholder} value={fields[key]} onChange={e => set(key,e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3" />
    </label>)}
   </div>
   <label className="block text-sm font-semibold">Sobre a loja<textarea rows={4} value={fields.about} onChange={e => set("about",e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3"/></label>
   <h3 className="font-bold">Imagens do rodapé</h3>
   <p className="text-sm text-muted-foreground">Estes campos alteram somente o rodapé. Para trocar a imagem grande do topo, use Imagens da página inicial acima.</p>
   <div className="grid gap-4 md:grid-cols-2">
     {(["logo_url","banner_url"] as const).map(field => <div key={field} className="space-y-3 rounded-lg border border-border p-4">
       <label className="block text-sm font-semibold">Enviar {field === "logo_url" ? "logo" : "banner"} (JPG, PNG, WebP, até 5 MB)
         <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={e => void upload(e,field)} className="mt-2 block w-full text-sm" />
       </label>
       {uploading === field && <p className="text-sm">Enviando imagem...</p>}
       {fields[field] && <img src={fields[field]} alt={field === "logo_url" ? "Prévia da logo" : "Prévia do banner"} className="max-h-40 max-w-full rounded-lg border border-border object-contain"/>}
       {fields[field] && <button type="button" disabled={busy || !!uploading} className="text-sm text-destructive underline" onClick={() => { set(field, ""); setMessage("Imagem removida da prévia. Confirme e salve os dados da loja para removê-la do rodapé."); }}>Apagar {field === "logo_url" ? "logo" : "banner"} do rodapé</button>}
     </div>)}
   </div>
   <button type="submit" disabled={busy || !!uploading} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Salvando..." : "Confirmar e salvar dados da loja"}</button>
   {message && <p role="status" className="text-sm">{message}</p>}
 </form>;
}
