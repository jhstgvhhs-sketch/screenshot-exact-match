import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type GatewayConfig = { id: string; provider: string; environment: string; pix_enabled: boolean; updated_at?: string };
const gatewayTable = () => (supabase as unknown as { from: (table: string) => any }).from("payment_gateway_settings");
const options = [{value:"none",label:"Nenhum (pagamento online desativado)"},{value:"mercadopago",label:"Mercado Pago"},{value:"asaas",label:"Asaas"},{value:"custom",label:"Outro gateway (requer adaptador de API)"}];
export function PaymentGatewaySettings() {
 const client=useQueryClient();
 const query=useQuery<GatewayConfig>({queryKey:["admin-payment-gateway"],queryFn:async()=>{const {data,error}=await gatewayTable().select("id,provider,environment,pix_enabled,updated_at").eq("id","main").maybeSingle();if(error)throw error;return data??{id:"main",provider:"none",environment:"sandbox",pix_enabled:false};}});
 if(query.isLoading)return <p className="mt-8">Carregando configurações de pagamento...</p>;
 if(query.isError)return <section className="mt-8 rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-bold">Gateway de pagamento</h2><p role="alert" className="mt-3 text-sm text-destructive">A tabela de configuração não está disponível. Aplique a migração payment_gateway_settings no Lovable Cloud.</p></section>;
 return <GatewayForm key={JSON.stringify(query.data)} current={query.data!} onSaved={()=>void client.invalidateQueries({queryKey:["admin-payment-gateway"]})}/>;
}
function GatewayForm({current,onSaved}:{current:GatewayConfig;onSaved:()=>void}) {
 const [provider,setProvider]=useState(current.provider);
 const [environment,setEnvironment]=useState(current.environment);
 const [pix,setPix]=useState(current.pix_enabled);
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState("");
 async function save() {
  if(!window.confirm("Salvar a seleção do gateway? Isso NÃO ativa cobranças até que as credenciais e o servidor sejam configurados."))return;
  setBusy(true);setFeedback("");
  const {error}=await gatewayTable().upsert({id:"main",provider,environment,pix_enabled:pix&&provider!=="none",updated_at:new Date().toISOString()},{onConflict:"id"});
  setFeedback(error?error.message:"Preferências salvas. A cobrança permanece indisponível até a integração segura do provedor e dos webhooks.");
  if(!error)onSaved();setBusy(false);
 }
 return <section className="mt-8 rounded-xl border border-border bg-card p-5">
  <h2 className="text-xl font-bold">Configuração de gateway Pix</h2>
  <p className="mt-2 text-sm text-muted-foreground">Escolha o provedor e o ambiente. Esta seção não recebe nem armazena chaves secretas no navegador.</p>
  <div className="mt-5 grid gap-4 sm:grid-cols-2">
   <label className="text-sm">Gateway<select value={provider} onChange={e=>setProvider(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
   <label className="text-sm">Ambiente<select value={environment} onChange={e=>setEnvironment(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3"><option value="sandbox">Teste / Sandbox</option><option value="production">Produção</option></select></label>
  </div>
  <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={pix} onChange={e=>setPix(e.target.checked)} disabled={provider==="none"}/> Pretendo aceitar Pix por este gateway</label>
  <p className="mt-4 rounded-lg border border-border p-3 text-sm text-muted-foreground">Para funcionar de verdade, cada gateway precisa de um adaptador no servidor, credenciais em Secrets, criação de cobranças e webhook validado. Selecionar o gateway aqui não gera Pix e não marca pedidos como pagos.</p>
  <button type="button" disabled={busy} onClick={()=>void save()} className="mt-4 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy?"Salvando...":"Confirmar configurações de pagamento"}</button>
  {feedback&&<p role="status" className="mt-3 text-sm">{feedback}</p>}
 </section>;
}
