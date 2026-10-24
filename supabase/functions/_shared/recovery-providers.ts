import { type RecoveryConfig, type RecoveryStep, renderRecoveryText } from "./recovery-rules.ts";

declare const Deno: { env: { get: (key: string) => string | undefined } };
export type SendResult={state:"accepted"|"failed"|"uncertain"|"queued";code:string;http?:number;providerId?:string};
const env=(key:string)=>Deno.env.get(key)??"";
const safeFetch=(url:string,init:RequestInit)=>fetch(url,{...init,signal:AbortSignal.timeout(10000)});
const classify=(status:number):SendResult=>({state:status===429?"queued":status>=500?"uncertain":"failed",code:status===429?"rate_limited":status>=500?"provider_uncertain":"provider_rejected",http:status});

export async function sendRecovery(channel:string,cfg:RecoveryConfig,step:RecoveryStep,to:string,name:string,link:string,optout:string,id:string):Promise<SendResult>{
 try{
  if(channel==="email"){
   const key=env("RESEND_API_KEY");
   if(!key||!env("RESEND_WEBHOOK_SECRET")||!cfg.email_from||cfg.email_from!==env("RECOVERY_EMAIL_FROM"))return {state:"failed",code:"email_configuration_missing"};
   const headers={Authorization:`Bearer ${key}`,"Content-Type":"application/json","User-Agent":"3DFLEX-Recovery/1.0"};
   // Check the sender domain without disclosing any customer data to the provider.
   const domains=await safeFetch("https://api.resend.com/domains?limit=100",{headers});
   if(!domains.ok)return {state:"failed",code:"sender_domain_not_verified",http:domains.status};
   const verified=await domains.json();const domain=cfg.email_from.split("@")[1];
   if(!verified.data?.some((d:any)=>d.name===domain&&d.status==="verified"))return {state:"failed",code:"sender_domain_not_verified"};
   const response=await safeFetch("https://api.resend.com/emails",{method:"POST",headers:{...headers,"Idempotency-Key":`3dflex-recovery/${id}`},body:JSON.stringify({from:cfg.email_from,to:[to],subject:step.subject,text:`${renderRecoveryText(step.text,name,link)}\n\nNão deseja receber lembretes deste carrinho? Cancele aqui: ${optout}`})});
   if(!response.ok)return classify(response.status);
   const data=await response.json();return typeof data.id==="string"?{state:"accepted",code:"provider_accepted",http:response.status,providerId:data.id}:{state:"uncertain",code:"provider_response_unrecognized"};
  }
  const key=env("WHATSAPP_ACCESS_TOKEN"),number=env("WHATSAPP_PHONE_NUMBER_ID"),account=env("WHATSAPP_WABA_ID"),version=env("WHATSAPP_GRAPH_VERSION");
  if(!key||!/^\d+$/.test(number)||!/^\d+$/.test(account)||!/^v\d+\.\d+$/.test(version)||!env("WHATSAPP_APP_SECRET")||!step.wa_template)return {state:"failed",code:"whatsapp_configuration_missing"};
  const headers={Authorization:`Bearer ${key}`,"Content-Type":"application/json"};
  const approved=await safeFetch(`https://graph.facebook.com/${version}/${account}/message_templates?name=${encodeURIComponent(step.wa_template)}&fields=name,status,language,components`,{headers});
  if(!approved.ok)return {state:"failed",code:"template_verification_failed",http:approved.status};
  const templates=await approved.json();
  const template=templates.data?.find((t:any)=>t.name===step.wa_template&&t.language===step.wa_language&&t.status==="APPROVED");
  const body=template?.components?.find((c:any)=>c.type==="BODY")?.text??"";
  if(!template||!body.includes("{{1}}")||!body.includes("{{2}}")||!body.includes("{{3}}")||body.includes("{{4}}")||template.components.some((c:any)=>!["BODY","FOOTER"].includes(c.type)))return {state:"failed",code:"approved_template_with_three_body_parameters_required"};
  const response=await safeFetch(`https://graph.facebook.com/${version}/${number}/messages`,{method:"POST",headers,body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to,type:"template",template:{name:step.wa_template,language:{code:step.wa_language},components:[{type:"body",parameters:[{type:"text",text:name.trim().split(/\s+/)[0]||"cliente"},{type:"text",text:link},{type:"text",text:optout}]}]}})});
  if(!response.ok)return classify(response.status);
  const data=await response.json();const providerId=data.messages?.[0]?.id;
  return typeof providerId==="string"?{state:"accepted",code:"provider_accepted",http:response.status,providerId}:{state:"uncertain",code:"provider_response_unrecognized"};
 }catch{return {state:"uncertain",code:"network_outcome_unknown_manual_review"};}
}
