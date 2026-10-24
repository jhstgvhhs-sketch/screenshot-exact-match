import { useEffect,useState, type ChangeEvent } from "react";
import { setRecoveryConsent } from "@/lib/cart-recovery";

export function RecoveryConsent(){
 const [email,setEmail]=useState(false),[whatsapp,setWhatsapp]=useState(false),[feedback,setFeedback]=useState("");
 useEffect(()=>{const form=document.getElementById("checkout-form");const reset=(event:Event)=>{const field=event.target as HTMLInputElement;if(field.name==="email")setEmail(false);if(field.name==="phone")setWhatsapp(false);};form?.addEventListener("input",reset);return()=>form?.removeEventListener("input",reset);},[]);
 async function change(event:ChangeEvent<HTMLInputElement>,channel:"email"|"whatsapp"){
  const form=event.target.form;if(!form)return;const granted=event.target.checked;
  const set=channel==="email"?setEmail:setWhatsapp;set(granted);setFeedback("");
  try{await setRecoveryConsent(form,channel,granted);}catch(error){set(false);setFeedback(error instanceof Error?error.message:"Não foi possível salvar sua preferência.");}
 }
 return <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
  <legend className="px-2 font-bold">Lembretes da sua compra (opcional)</legend>
  <p className="text-xs text-muted-foreground">Salvamos os itens e os dados de contato informados para retomar esta compra, por até 30 dias. CPF, endereço e dados de pagamento não são enviados ao sistema de recuperação. A compra não depende destas autorizações.</p>
  <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={email} onChange={event=>void change(event,"email")}/> Autorizo a 3DFLEX a enviar até 3 lembretes deste carrinho por e-mail.</label>
  <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={whatsapp} onChange={event=>void change(event,"whatsapp")}/> Autorizo a 3DFLEX a enviar até 3 lembretes deste carrinho pelo WhatsApp.</label>
  <p className="text-xs text-muted-foreground">Você pode desmarcar estas opções ou cancelar pelos links nas mensagens. Ao mudar o contato, autorize novamente o canal. <a href="/info/privacidade" className="text-primary underline">Política de privacidade</a></p>
  {feedback&&<p role="status" className="text-xs text-muted-foreground">{feedback}</p>}
 </fieldset>;
}
