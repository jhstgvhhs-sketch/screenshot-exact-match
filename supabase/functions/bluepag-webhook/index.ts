import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { getBluePagPayment } from "./_shared/bluepag.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const body=await req.json().catch(()=>null), event=body?.event, uuid=body?.data?.uuid;
  if(typeof uuid!=="string"||uuid.length>128||!["transaction.completed","transaction.failed"].includes(event))return json({error:"Invalid notification"},400);
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return json({error:"Server unavailable"},503);
  const admin=createClient(url,key);
  const {data:payment,error}=await admin.from("pix_transactions").select("order_id,amount_cents,status").eq("transaction_id",uuid).maybeSingle();
  if(error)return json({error:"Payment lookup unavailable"},503);
  if(!payment)return json({error:"Unknown transaction"},404);
  // Signature format is unspecified in provider docs; callback is only a hint.
  // Independently verify UUID, PIX type, amount and status via BluePag OAuth API.
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
