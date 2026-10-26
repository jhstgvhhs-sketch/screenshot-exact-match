import { paymentLabel, paymentState } from "@/lib/payment-status";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";

const orderStatusPt: Record<string,string> = {pending:"Pendente",aguardando_pagamento:"Aguardando pagamento",processing:"Em preparação",processando:"Em preparação",shipped:"Enviado",enviado:"Enviado",delivered:"Entregue",entregue:"Entregue",cancelled:"Cancelado",cancelado:"Cancelado"};
const paymentMethodPt: Record<string,string> = {cartao:"Cartão de crédito",card:"Cartão de crédito",pix:"Pix"};
const translate = (value:string|null, dict:Record<string,string>) => value ? (dict[value] ?? value) : "Não informado";
export function CustomerOrderAdmin() {
 const client = useQueryClient();
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("all");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState("");
 const customers = useQuery({queryKey:["admin-customers"],queryFn:async()=>{
  const {data,error}=await supabase.from("profiles").select("id,full_name,phone,created_at").order("created_at",{ascending:false});
  if(error)throw error;return data??[];
 }});
 const orders = useQuery({queryKey:["admin-orders"],queryFn:async()=>{
  const {data,error}=await supabase.from("orders").select("id,user_id,customer_name,customer_email,customer_phone,created_at,total,subtotal,shipping,status,payment_status,payment_method,tracking_code,ship_city,ship_state").is("archived_at",null).order("created_at",{ascending:false});
  if(error)throw error;return data??[];
 }});
 const visibleCustomers=(customers.data??[]).filter(c=>([c.full_name,c.phone].join(" ").toLowerCase().includes(search.toLowerCase())));
 const visibleOrders=(orders.data??[]).filter(o=>filter==="all"||(filter==="paid"?paymentState(o.payment_status)==="paid":filter==="pending"?paymentState(o.payment_status)==="pending":o.status===filter));
 const paid=(orders.data??[]).filter(o=>paymentState(o.payment_status)==="paid"&&!["cancelled","cancelado"].includes(o.status));
 async function archiveOrder(id:string) {
  if(!window.confirm("Remover este pedido da lista? Ele será arquivado, sem apagar registros financeiros ou devolver estoque automaticamente."))return;
  setBusy(id);setMessage("");
  const {data,error}=await supabase.rpc("archive_order_admin" as never,{p_order_id:id} as never);
  setMessage(error?error.message:data?"Pedido removido da lista e arquivado.":"Não foi possível arquivar o pedido.");
  if(!error&&data)void client.invalidateQueries({queryKey:["admin-orders"]});
  setBusy("");
 }
 async function updateOrder(id:string,updates:{status?:string;payment_status?:string;tracking_code?:string|null}) {
  if(updates.payment_status==="paid"&&!window.confirm("Você confirmou o recebimento real deste pagamento no banco, extrato ou gateway? Esta ação NÃO cobra o cliente."))return;
  if(!window.confirm("Confirmar atualização do pedido?"))return;
  setBusy(id);setMessage("");
  const {data,error}=await supabase.from("orders").update(updates).eq("id",id).select("id").single();
  setMessage(error?error.message:!data?"O banco não confirmou a alteração.":"Pedido atualizado.");
  if(!error&&data)void client.invalidateQueries({queryKey:["admin-orders"]});
  setBusy("");
 }
 return <div className="mt-10 space-y-8">
  <section className="rounded-xl border border-border bg-card p-5">
   <h2 className="text-xl font-bold">Clientes cadastrados</h2>
   <p className="mt-2 text-sm text-muted-foreground">Contas com perfil registrado; não representa usuários online. O cadastro não é excluído nem alterado aqui.</p>
   <p className="mt-4 text-2xl font-bold">{customers.data?.length??"—"} <span className="text-sm font-normal text-muted-foreground">perfis</span></p>
   <input aria-label="Pesquisar clientes" placeholder="Pesquisar nome ou telefone" value={search} onChange={e=>setSearch(e.target.value)} className="mt-4 w-full max-w-md rounded-lg border border-input bg-background p-3"/>
   {customers.isLoading&&<p className="mt-3">Carregando clientes...</p>}
   {customers.isError&&<p role="alert" className="mt-3 text-sm text-destructive">Não foi possível carregar clientes. Verifique a permissão administrativa da tabela profiles.</p>}
   <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Nome</th><th className="p-3">Telefone</th><th className="p-3">Cadastro</th><th className="p-3">Pedidos</th></tr></thead><tbody>{visibleCustomers.map(c=><tr key={c.id} className="border-t border-border"><td className="p-3">{c.full_name||"Não informado"}</td><td className="p-3">{c.phone||"Não informado"}</td><td className="p-3">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td><td className="p-3">{(orders.data??[]).filter(o=>o.user_id===c.id).length}</td></tr>)}</tbody></table></div>
  </section>
  <section className="rounded-xl border border-border bg-card p-5">
   <h2 className="text-xl font-bold">Gestão de pedidos</h2>
   <p className="mt-2 text-sm text-muted-foreground">Exibe os pedidos registrados no banco. Pedidos por cartão aguardam confirmação manual do recebimento; o Pix depende da integração com o gateway.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-3">
    <div className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Pedidos registrados</p><p className="text-2xl font-bold">{orders.data?.length??"—"}</p></div>
    <div className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Marcados como pagos</p><p className="text-2xl font-bold">{paid.length}</p></div>
    <div className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Total marcado como pago</p><p className="text-2xl font-bold">{brl(paid.reduce((s,o)=>s+Number(o.total),0))}</p></div>
   </div>
   <label className="mt-5 block max-w-sm text-sm">Filtrar pedidos<select value={filter} onChange={e=>setFilter(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background p-3"><option value="all">Todos</option><option value="paid">Pagos</option><option value="pending">Pagamento pendente</option><option value="processing">Em processamento</option><option value="shipped">Enviados</option><option value="delivered">Entregues</option></select></label>
   {orders.isLoading&&<p className="mt-4">Carregando pedidos...</p>}
   {orders.isError&&<p role="alert" className="mt-4 text-sm text-destructive">Não foi possível consultar os pedidos. Verifique as políticas administrativas de orders.</p>}
   {!orders.isLoading&&!orders.isError&&!visibleOrders.length&&<p className="mt-4 text-sm text-muted-foreground">Nenhum pedido encontrado neste filtro.</p>}
   <div className="mt-5 space-y-4">{visibleOrders.map(o=><OrderAdminCard key={o.id} order={o} busy={busy===o.id} onUpdate={updates=>void updateOrder(o.id,updates)} onArchive={()=>void archiveOrder(o.id)}/>)}</div>
   {message&&<p role="status" className="mt-4 text-sm">{message}</p>}
  </section>
 </div>;
}
type AdminOrder={id:string;customer_name:string;customer_email:string;customer_phone:string;created_at:string;total:number;status:string;payment_status:string;payment_method:string|null;tracking_code:string|null;ship_city:string;ship_state:string};
function OrderAdminCard({order,onUpdate,onArchive,busy}:{order:AdminOrder;onUpdate:(updates:{status?:string;payment_status?:string;tracking_code?:string|null})=>void;onArchive:()=>void;busy:boolean}) {
 const [status,setStatus]=useState(order.status);
 const [tracking,setTracking]=useState(order.tracking_code??"");
 return <article className="rounded-lg border border-border p-4">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">Pedido {order.id.slice(0,8).toUpperCase()}</p><p className="mt-1 text-sm">{order.customer_name} · {order.customer_email}</p><p className="mt-1 text-sm text-muted-foreground">{order.customer_phone} · {order.ship_city}/{order.ship_state} · {new Date(order.created_at).toLocaleDateString("pt-BR")}</p></div><p className="text-lg font-bold">{brl(Number(order.total))}</p></div>
  <p className="mt-3 text-sm">Pagamento: <strong>{paymentLabel(order.payment_status)}</strong> · Método: {translate(order.payment_method,paymentMethodPt)}</p>
  <div className="mt-4 grid gap-3 md:grid-cols-2">
   <label className="text-sm">Status do pedido<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-2"><option value={order.status}>{translate(order.status,orderStatusPt)}</option>{["pending","processing","shipped","delivered","cancelled"].filter(s=>s!==order.status).map(s=><option key={s} value={s}>{translate(s,orderStatusPt)}</option>)}</select></label>
   <label className="text-sm">Código de rastreio<input value={tracking} onChange={e=>setTracking(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-input bg-background p-2"/></label>
  </div>
  <div className="mt-4 flex flex-wrap gap-3">
   <button type="button" disabled={busy||(status===order.status&&tracking===(order.tracking_code??""))} onClick={()=>onUpdate({status,tracking_code:tracking.trim()||null})} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">Salvar andamento</button>
   <button type="button" disabled={busy} onClick={onArchive} className="rounded-lg border border-destructive px-4 py-2 font-semibold text-destructive disabled:opacity-50">Apagar da lista</button>
   {paymentState(order.payment_status)!=="paid"&&<button type="button" disabled={busy} onClick={()=>onUpdate({payment_status:"paid"})} className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-50">Confirmar pagamento recebido</button>}
  </div>
 </article>;
}
