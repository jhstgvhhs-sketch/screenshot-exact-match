import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CartItem } from "./cart";

const KEY="3dflex-recovery-session",CLOSED="3dflex-recovery-completed",SOURCE="3dflex-recovery-source";
let items:CartItem[]=[];
let queue=Promise.resolve<unknown>(null);
let draft:{name:string;email:string;phone:string}|undefined;
let timer:ReturnType<typeof setTimeout>;
const fingerprint=(values:CartItem[])=>JSON.stringify(values.map(i=>[i.variantId,i.quantity]).sort());
function sessionToken(){let token=localStorage.getItem(KEY);if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,"0")).join("");localStorage.setItem(KEY,token);}return token;}
export async function recoveryRequest(body:Record<string,unknown>){
 if(body.action==="sync"){
  const {data,error}=await supabase.rpc("registry_sync_cart",{p_token:String(body.token??""),p_items:body.items as Json,p_contact:(body.contact??null) as Json,p_consents:(body.consentChanges??null) as Json,p_source:(body.sourceToken??null) as string});
  if(error){if(error.message?.includes("Cart session unavailable")){localStorage.removeItem(KEY);draft=undefined;}throw new Error("Não foi possível registrar o carrinho. Sua compra pode continuar normalmente.");}
  return data;
 }
 const {data,error}=await supabase.functions.invoke("recovery-carts",{body});
 if(error){
  let detail:{error?:string;code?:string}|null=null;
  try{detail=await error.context?.json();}catch{/* Do not expose transport or credential details. */}
  if(detail?.code==="rotate_session"){localStorage.removeItem(KEY);draft=undefined;}
  throw new Error(detail?.error || "Recuperação temporariamente indisponível. Sua compra pode continuar normalmente.");
 }
 if(data?.error)throw new Error(data.error);return data;
}
function enqueue(changes?:Record<string,boolean>){
 try{
  const snapshot=fingerprint(items);
  if(localStorage.getItem(CLOSED)===snapshot)return Promise.resolve(null);
  localStorage.removeItem(CLOSED);
  const body={action:"sync",token:sessionToken(),items:items.map(i=>({variant_id:i.variantId,quantity:i.quantity})),...(draft?{contact:{...draft}}:{}),...(changes?{consentChanges:changes}:{}),sourceToken:localStorage.getItem(SOURCE)};
  const result=queue.catch(()=>null).then(()=>recoveryRequest(body));
  queue=result.then(data=>{if(data?.cartId===null&&body.items.length){localStorage.setItem(CLOSED,snapshot);localStorage.removeItem(KEY);}return data;});
  // Prevent an unhandled rejection from ever affecting cart/checkout rendering.
  void queue.catch(()=>null);return result;
 }catch{return Promise.resolve(null);}
}
export function trackRecoveryCart(values:CartItem[]){items=values;clearTimeout(timer);if(typeof window!=="undefined"&&/^\/(admin|conta|recuperar|descadastrar)(?:\/|$)/.test(window.location.pathname))return;timer=setTimeout(()=>{void enqueue().catch(()=>null);},800);}
export function captureRecoveryContact(form:HTMLFormElement){
 const data=new FormData(form);draft={name:String(data.get("name")??""),email:String(data.get("email")??""),phone:String(data.get("phone")??"")};
 clearTimeout(timer);timer=setTimeout(()=>{void enqueue().catch(()=>null);},800);
}
export function setRecoveryConsent(form:HTMLFormElement,channel:"email"|"whatsapp",granted:boolean){captureRecoveryContact(form);clearTimeout(timer);return enqueue({[channel]:granted});}
export function markRecoveryCompleted(){try{localStorage.setItem(CLOSED,fingerprint(items));localStorage.removeItem(KEY);localStorage.removeItem(SOURCE);draft=undefined;}catch{/* Storage is optional. */}}
export function setRecoverySource(token:string){try{localStorage.setItem(SOURCE,token);localStorage.removeItem(CLOSED);}catch{/* Optional. */}}

