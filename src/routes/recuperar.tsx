import { createFileRoute,Link } from "@tanstack/react-router";
import { useEffect,useState } from "react";
import { useCart,type CartItem } from "@/lib/cart";
import { recoveryRequest,setRecoverySource } from "@/lib/cart-recovery";
import { brl } from "@/lib/store";

export const Route=createFileRoute("/recuperar")({head:()=>({meta:[{title:"Recuperar carrinho — 3DFLEX"},{name:"robots",content:"noindex, nofollow"},{name:"referrer",content:"no-referrer"}]}),component:RecoverCart});
function RecoverCart(){
 const cart=useCart();const [token,setToken]=useState("");const [items,setItems]=useState<CartItem[]|null>(null);const [error,setError]=useState("");const [removed,setRemoved]=useState(0);const [restored,setRestored]=useState(false);const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;const value=new URLSearchParams(window.location.hash.slice(1)).get("token")??"";window.history.replaceState(null,"",window.location.pathname);setToken(value);
  if(!value){setError("Link de recuperação inválido.");return;}
  void recoveryRequest({action:"resolve",token:value}).then(data=>{if(active){setItems(data.items);setRemoved(data.removed);}}).catch(err=>{if(active)setError(err.message);});return()=>{active=false;};
 },[]);
 return <section className="container-x max-w-2xl space-y-5 py-12"><h1 className="text-3xl font-bold">Continue sua compra</h1><p className="text-sm text-muted-foreground">Preços e disponibilidade foram consultados novamente. O frete e eventuais descontos serão recalculados no checkout. Nenhum produto é reservado por este link.</p>
  {error&&<p role="alert" className="rounded-lg border p-4">{error} Confira também seus pedidos em <Link to="/conta" className="text-primary underline">Minha conta</Link>.</p>}
  {!items&&!error&&<p role="status">Consultando produtos atuais…</p>}
  {items&&<><ul className="space-y-3">{items.map(item=><li key={item.variantId} className="flex justify-between gap-3 rounded-lg border p-4"><span>{item.name} · {item.color} × {item.quantity}</span><strong>{brl(item.price*item.quantity)}</strong></li>)}</ul>{removed>0&&<p className="text-sm">Alguns itens não estão mais disponíveis e foram retirados.</p>}
  {!items.length?<p>Os itens deste carrinho não estão mais disponíveis.</p>:restored?<Link to="/carrinho" className="inline-block rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">Conferir carrinho e finalizar</Link>:<button type="button" disabled={busy} onClick={()=>{if(cart.items.length&&!window.confirm("Substituir seu carrinho atual pelos produtos deste link?"))return;setBusy(true);void recoveryRequest({action:"resolve",token}).then(data=>{setItems(data.items);setRemoved(data.removed);setRecoverySource(token);cart.replace(data.items);setRestored(true);}).catch(err=>setError(err.message)).finally(()=>setBusy(false));}} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">{busy?"Conferindo carrinho…":"Restaurar carrinho"}</button>}</>}
 </section>;
}
