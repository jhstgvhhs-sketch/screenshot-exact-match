import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { getBluePagPayment } from "./bluepag.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
async function verifyWebhookSignature(rawBody:string, signature:string, secret:string):Promise<boolean>{
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const digest=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(rawBody)));
 const expected=Array.from(digest,value=>value.toString(16).padStart(2,"0")).join("");
 let mismatch=0;
 for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);
 return mismatch===0;
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const secret=Deno.env.get("BLUEPAG_CLIENT_SECRET"), signature=req.headers.get("X-Webhook-Signature");
  if(!secret)return json({error:"Webhook não configurado"},503);
  if(!signature)return json({error:"Assinatura ausente"},401);
  const rawBody=await req.text();
  if(!await verifyWebhookSignature(rawBody,signature,secret))return json({error:"Assinatura inválida"},401);
  const body=JSON.parse(rawBody), event=body?.event, uuid=body?.data?.uuid;
  if(typeof uuid!=="string"||uuid.length>128||!["transaction.completed","transaction.failed"].includes(event))return json({error:"Invalid notification"},400);
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return json({error:"Server unavailable"},503);
  const admin=createClient(url,key);
  const {data:payment,error}=await admin.from("pix_transactions").select("order_id,amount_cents,status").eq("transaction_id",uuid).maybeSingle();
  if(error)return json({error:"Payment lookup unavailable"},503);
  if(!payment)return json({error:"Unknown transaction"},404);
  // A assinatura HMAC valida a origem; a API confirma UUID, tipo, valor e status.
  const verified=await getBluePagPayment(uuid), gross=Number(verified.amount_gross??verified.amount);
  if(verified.uuid!==uuid||verified.type!=="pix"||!Number.isFinite(gross)||Math.round(gross*100)!==payment.amount_cents)return json({error:"Payment verification mismatch"},409);
  const raw=String(verified.status).toLowerCase(), next=raw==="completed"||raw==="paid"?"paid":["failed","cancelled","canceled"].includes(raw)?"cancelled":raw==="expired"?"expired":null;
  if(!next)return json({ok:true,pending:true});
  const {data:result,error:settleError}=await admin.rpc("settle_pix_order",{p_order_id:payment.order_id,p_transaction_id:uuid,p_amount_cents:payment.amount_cents,p_gateway_status:next});
  if(settleError)return json({error:"Settlement unavailable"},503);
  if(["manual_review","mismatch","unknown_order"].includes(String(result)))return json({error:"Payment requires manual reconciliation"},409);
  return json({ok:true,result});
 }catch{return json({error:"Could not verify BluePag notification"},503)}
});
