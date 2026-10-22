import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { consultBlackcatPix } from "../_shared/blackcat.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try {
  // Blackcat documentation does not specify a signed webhook. Never trust its status alone.
  const body=await req.json();
  const transactionId=body?.transactionId ?? body?.data?.transactionId;
  if(typeof transactionId!=="string"||transactionId.length>128)return json({error:"Invalid transaction"},400);
  const url=Deno.env.get("SUPABASE_URL")!;
  const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:payment,error}=await admin.from("pix_transactions").select("order_id,amount_cents,status").eq("transaction_id",transactionId).maybeSingle();
  if(error||!payment)return json({error:"Unknown transaction"},404);
  const status=await consultBlackcatPix(transactionId);
  if(status.transactionId!==transactionId||Number(status.amount)!==payment.amount_cents)return json({error:"Gateway amount mismatch"},409);
  const rawStatus=String(status.status).toUpperCase();
  const next=rawStatus==="PAID"||rawStatus==="APPROVED"?"paid":
    rawStatus==="CANCELLED"||rawStatus==="CANCELED"?"cancelled":
    rawStatus==="EXPIRED"?"expired":null;
  if(!next)return json({ok:true,ignored:true});
  const {data:result,error:settleError}=await admin.rpc("settle_pix_order",{
    p_order_id:payment.order_id,p_transaction_id:transactionId,
    p_amount_cents:payment.amount_cents,p_gateway_status:next
  });
  if(settleError)return json({error:"Settlement unavailable"},503);
  if(result==="manual_review"||result==="mismatch"||result==="unknown_order")
    return json({error:"Payment requires manual reconciliation"},409);

  return json({ok:true});
 }catch{return json({error:"Could not verify gateway status"},503)}
});