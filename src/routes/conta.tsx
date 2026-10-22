import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/store";

export const Route = createFileRoute("/conta")({
  validateSearch: (s: Record<string, unknown>): { aba?: string } => ({ aba: typeof s.aba === "string" ? s.aba : undefined }),
  head: () => ({ meta: [{ title: "Minha conta — 3DFLEX" }, { name: "description", content: "Cadastro, dados pessoais, endereços e pedidos 3DFLEX." }] }),
  component: CustomerAccount,
});
const input = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2";
type Tab = "dados" | "enderecos" | "pedidos";
function CustomerAccount() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("dados");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!user) return;
    const metadata = user.user_metadata as { full_name?: string; phone?: string };
    if (!metadata?.full_name && !metadata?.phone) return;
    void (async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,phone").eq("id", user.id).maybeSingle();
      if (error) return;
      if (!data) {
        await supabase.from("profiles").insert({ id: user.id, full_name: metadata.full_name ?? null, phone: metadata.phone ?? null });
      } else if (!data.full_name || !data.phone) {
        await supabase.from("profiles").update({ full_name: data.full_name || metadata.full_name || null, phone: data.phone || metadata.phone || null }).eq("id", user.id);
      }
    })();
  }, [user?.id]);
  async function auth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/conta" });
        if (error) throw error;
        setNotice("Se este e-mail estiver cadastrado, enviaremos instruções de recuperação.");
      } else if (mode === "register") {
        const cleanName = fullName.trim();
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanName.length < 3 || cleanPhone.length < 10 || cleanPhone.length > 11) throw new Error("Informe nome completo e telefone com DDD (10 ou 11 dígitos).");
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: cleanName, phone: cleanPhone } } });
        if (error) throw error;
        if (data.session && data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, full_name: cleanName, phone: cleanPhone }, { onConflict: "id" });
          if (profileError) setNotice("Conta criada, mas os dados do perfil não foram sincronizados. Verifique em Meus dados.");
        }
        setNotice(data.session ? "Conta criada com sucesso." : "Cadastro solicitado. Confira seu e-mail para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      setPassword("");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Não foi possível continuar."); }
    finally { setBusy(false); }
  }
  if (loading) return <section className="container-x py-12">Carregando sua conta...</section>;
  if (!user) return <section className="container-x mx-auto max-w-lg py-12">
    <h1 className="text-3xl font-bold">Área do cliente</h1>
    <p className="mt-3 text-muted-foreground">Entre para acompanhar seus pedidos e atualizar seus dados.</p>
    <form onSubmit={auth} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">{mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha"}</h2>
      {mode === "register" && <><label className="block text-sm">Nome completo<input type="text" required minLength={3} maxLength={120} autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} className={input}/></label><label className="block text-sm">Telefone com DDD<input type="tel" required minLength={10} maxLength={20} autoComplete="tel" placeholder="(71) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} className={input}/></label></>}
      <label className="block text-sm">E-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input}/></label>
      {mode !== "reset" && <label className="block text-sm">Senha<input type="password" required minLength={6} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} className={input}/></label>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary p-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar recuperação"}</button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <div className="flex flex-wrap gap-4 text-sm text-primary">
        <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setNotice(""); }}>{mode === "register" ? "Já tenho conta" : "Criar conta"}</button>
        <button type="button" onClick={() => { setMode(mode === "reset" ? "login" : "reset"); setNotice(""); }}>{mode === "reset" ? "Voltar ao login" : "Esqueci minha senha"}</button>
      </div>
    </form>
  </section>;
  return <section className="container-x py-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Minha conta</h1><p className="mt-2 text-sm text-muted-foreground">{user.email}</p></div>
      <button type="button" onClick={() => void supabase.auth.signOut()} className="rounded-lg border border-border px-4 py-2">Sair da conta</button>
    </div>
    <div className="mt-8 flex flex-wrap gap-3">{(["dados","enderecos","pedidos"] as const).map(t => <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-5 py-3 font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "border border-border"}`}>{({dados:"Meus dados",enderecos:"Endereços",pedidos:"Meus pedidos"})[t]}</button>)}</div>
    {tab === "dados" && <CustomerProfile userId={user.id}/>}
    {tab === "enderecos" && <CustomerAddresses userId={user.id}/>}
    {tab === "pedidos" && <CustomerOrders userId={user.id}/>}
  </section>;
}
function CustomerProfile({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["customer-profile",userId], queryFn: async () => { const r = await supabase.from("profiles").select("full_name,phone,cpf").eq("id",userId).maybeSingle(); if(r.error) throw r.error; return r.data; } });
  if (isLoading) return <p className="mt-6">Carregando seus dados...</p>;
  if (error) return <p className="mt-6 text-destructive">Não foi possível carregar os dados.</p>;
  return <ProfileForm key={JSON.stringify(data)} userId={userId} initial={data} onSaved={() => void qc.invalidateQueries({queryKey:["customer-profile",userId]})}/>;
}
function ProfileForm({userId,initial,onSaved}:{userId:string;initial:{full_name:string|null;phone:string|null;cpf:string|null}|null;onSaved:()=>void}) {
  const [name,setName]=useState(initial?.full_name??"");
  const [phone,setPhone]=useState(initial?.phone??"");
  const [cpf,setCpf]=useState(initial?.cpf??"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function save(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setMessage("");
    const result=await supabase.from("profiles").upsert({id:userId,full_name:name.trim()||null,phone:phone.trim()||null,cpf:cpf.trim()||null},{onConflict:"id"});
    setMessage(result.error ? result.error.message : "Dados atualizados com sucesso.");
    if(!result.error)onSaved();setBusy(false);
  }
  return <form onSubmit={save} className="mt-6 max-w-xl space-y-4 rounded-xl border border-border bg-card p-5">
    <h2 className="text-xl font-bold">Meus dados</h2>
    <label className="block text-sm">Nome completo<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} className={input}/></label>
    <label className="block text-sm">Telefone<input value={phone} onChange={e=>setPhone(e.target.value)} maxLength={20} className={input}/></label>
    <label className="block text-sm">CPF (opcional)<input value={cpf} onChange={e=>setCpf(e.target.value)} maxLength={14} className={input}/></label>
    <button disabled={busy} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">Salvar meus dados</button>
    {message&&<p role="status" className="text-sm">{message}</p>}
  </form>;
}
function CustomerAddresses({userId}:{userId:string}) {
 const qc=useQueryClient();
 const {data=[],isLoading,error}=useQuery({queryKey:["customer-addresses",userId],queryFn:async()=>{const r=await supabase.from("addresses").select("*").eq("user_id",userId).order("created_at",{ascending:false});if(r.error)throw r.error;return r.data;}});
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function add(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  const form=new FormData(e.currentTarget);
  const value=(k:string)=>String(form.get(k)??"").trim();
  const r=await supabase.from("addresses").insert({user_id:userId,label:value("label")||null,cep:value("cep"),street:value("street"),number:value("number"),complement:value("complement")||null,district:value("district"),city:value("city"),state:value("state").toUpperCase()});
  setMessage(r.error?r.error.message:"Endereço salvo.");
  if(!r.error){e.currentTarget.reset();void qc.invalidateQueries({queryKey:["customer-addresses",userId]});}setBusy(false);
 }
 async function remove(id:string){if(!window.confirm("Remover este endereço?"))return;const r=await supabase.from("addresses").delete().eq("id",id).eq("user_id",userId);setMessage(r.error?r.error.message:"Endereço removido.");if(!r.error)void qc.invalidateQueries({queryKey:["customer-addresses",userId]});}
 return <div className="mt-6 space-y-5"><h2 className="text-xl font-bold">Meus endereços</h2>
  {isLoading?<p>Carregando...</p>:error?<p className="text-destructive">Não foi possível carregar seus endereços.</p>:data.map(a=><div key={a.id} className="rounded-xl border border-border bg-card p-4"><p className="font-semibold">{a.label||"Endereço"}</p><p className="mt-2 text-sm">{a.street}, {a.number}{a.complement?", "+a.complement:""} — {a.district}, {a.city}/{a.state} — CEP {a.cep}</p><button type="button" onClick={()=>void remove(a.id)} className="mt-3 text-sm text-destructive underline">Remover endereço</button></div>)}
  <form onSubmit={e=>void add(e)} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
   <h3 className="text-lg font-bold sm:col-span-2">Adicionar endereço</h3>
   {([{k:"label",t:"Identificação (casa, trabalho)",required:false},{k:"cep",t:"CEP",required:true},{k:"street",t:"Rua / avenida",required:true},{k:"number",t:"Número",required:true},{k:"complement",t:"Complemento",required:false},{k:"district",t:"Bairro",required:true},{k:"city",t:"Cidade",required:true},{k:"state",t:"UF",required:true}] as const).map(f=><label key={f.k} className="text-sm">{f.t}<input name={f.k} required={f.required} maxLength={f.k==="state"?2:160} className={input}/></label>)}
   <button disabled={busy} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2">{busy?"Salvando...":"Salvar endereço"}</button>
  </form>{message&&<p role="status" className="text-sm">{message}</p>}
 </div>;
}
function CustomerOrders({userId}:{userId:string}) {
 const {data=[],isLoading,error}=useQuery({queryKey:["customer-orders",userId],queryFn:async()=>{const r=await supabase.from("orders").select("id,created_at,status,payment_status,total,tracking_code,ship_city,ship_state").eq("user_id",userId).order("created_at",{ascending:false});if(r.error)throw r.error;return r.data;}});
 return <div className="mt-6 space-y-4"><h2 className="text-xl font-bold">Meus pedidos</h2>
  {isLoading?<p>Carregando pedidos...</p>:error?<p className="text-destructive">Não foi possível consultar os pedidos. Verifique as permissões da conta.</p>:data.length===0?<div className="rounded-xl border border-border bg-card p-5"><p>Você ainda não tem pedidos registrados nesta conta.</p><p className="mt-2 text-sm text-muted-foreground">Pedidos feitos fora da conta ou ainda não registrados pelo checkout não aparecem aqui.</p><Link to="/produtos" className="mt-4 inline-block text-primary underline">Ver produtos</Link></div>:data.map(o=><article key={o.id} className="rounded-xl border border-border bg-card p-5"><p className="font-bold">Pedido {o.id.slice(0,8).toUpperCase()}</p><p className="mt-2 text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.ship_city}/{o.ship_state}</p><p className="mt-2">Total: <strong>{brl(Number(o.total))}</strong></p><p className="mt-1 text-sm">Status: {o.status} · Pagamento: {o.payment_status}</p>{o.tracking_code&&<p className="mt-2 text-sm">Código de rastreio: {o.tracking_code}</p>}</article>)}
 </div>;
}
