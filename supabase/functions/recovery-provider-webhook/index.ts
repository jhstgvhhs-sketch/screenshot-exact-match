import { adminClient,json } from "../_shared/recovery-server.ts";
import { normalizeEmail,normalizePhone,sha256,equalSecret } from "../_shared/recovery-rules.ts";
import { verifyMeta,verifyResend } from "../_shared/recovery-webhook-signatures.ts";

Deno.serve(async request=>{
 const url=new URL(request.url);const provider=url.searchParams.get("provider");
 if(request.method==="GET"&&provider==="whatsapp"){
  if(url.searchParams.get("hub.mode")==="subscribe"&&await equalSecret(url.searchParams.get("hub.verify_token")??"",Deno.env.get("WHATSAPP_VERIFY_TOKEN")??""))return new Response(url.searchParams.get("hub.challenge"));
  return json({error:"Unauthorized"},401);
 }
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const raw=await request.text();if(raw.length>250000)return json({error:"Payload too large"},413);
  if(provider==="whatsapp"){
   if(!await verifyMeta(raw,request.headers.get("x-hub-signature-256")??"",Deno.env.get("WHATSAPP_APP_SECRET")??""))return json({error:"Invalid signature"},401);
  }else if(provider==="email"){
   if(!await verifyResend(raw,request.headers.get("svix-id")??"",request.headers.get("svix-timestamp")??"",request.headers.get("svix-signature")??"",Deno.env.get("RESEND_WEBHOOK_SECRET")??""))return json({error:"Invalid signature"},401);
  }else return json({error:"Unknown provider"},400);
  const body=JSON.parse(raw);const db=adminClient();
  async function optout(channel:string,destination:string){
   const hash=await sha256(destination);
   const {data:consent}=await db.from("recovery_consents").select("cart_id").eq("channel",channel).eq("contact_hash",hash).limit(1).maybeSingle();
   if(consent){const {error}=await db.rpc("recovery_stop",{p_cart:consent.cart_id,p_channel:channel,p_hash:hash});if(error)throw error;}
  }
  if(provider==="whatsapp"){
   for(const entry of body.entry??[])for(const change of entry.changes??[]){
    for(const message of change.value?.messages??[]){const text=String(message.text?.body??message.button?.payload??"").trim().toLowerCase();if(["sair","parar","cancelar","stop","descadastrar"].includes(text)){const phone=normalizePhone(message.from);if(phone)await optout("whatsapp",phone);}}
    for(const status of change.value?.statuses??[]){
     if(!["delivered","read","failed"].includes(status.status))continue;
     await db.from("recovery_jobs").update({result_code:`provider_${status.status}`}).eq("provider_id",String(status.id));
    }
   }
  }else{
   if(["email.bounced","email.complained"].includes(body.type))for(const to of body.data?.to??[]){const email=normalizeEmail(to);if(email)await optout("email",email);}
   if(["email.delivered","email.bounced","email.complained","email.failed"].includes(body.type))await db.from("recovery_jobs").update({result_code:String(body.type).replace(".","_")}).eq("provider_id",String(body.data?.email_id??""));
  }
  return json({ok:true});
 }catch{return json({error:"Webhook unavailable"},503);}
});
