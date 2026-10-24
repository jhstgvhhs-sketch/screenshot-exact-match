import { createFileRoute } from "@tanstack/react-router";
import { useEffect,useState } from "react";
import { recoveryRequest } from "@/lib/cart-recovery";
export const Route=createFileRoute("/descadastrar")({head:()=>({meta:[{title:"Cancelar lembretes — 3DFLEX"},{name:"robots",content:"noindex, nofollow"}]}),component:Unsubscribe});
function Unsubscribe(){const [token,setToken]=useState("");const [done,setDone]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{setToken(new URLSearchParams(window.location.hash.slice(1)).get("token")??"");window.history.replaceState(null,"",window.location.pathname);},[]);
 async function cancel(){setBusy(true);try{await recoveryRequest({action:"unsubscribe",token});setDone(true);}catch(err){setError(err instanceof Error?err.message:"Não foi possível cancelar.");}finally{setBusy(false);}}
 return <section className="container-x max-w-xl space-y-5 py-12"><h1 className="text-3xl font-bold">Cancelar lembretes</h1>{done?<p role="status">Sua preferência foi registrada. Os próximos lembretes deste canal foram cancelados.</p>:<><p>Confirme para deixar de receber lembretes de carrinho pelo canal desta mensagem. Isso não cancela pedidos nem pagamentos.</p><button type="button" disabled={busy||!token} onClick={()=>void cancel()} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy?"Cancelando…":"Não quero receber lembretes"}</button>{!token&&<p>Link inválido. Utilize o link da mensagem recebida.</p>}{error&&<p role="alert">{error}</p>}</>}</section>;
}
