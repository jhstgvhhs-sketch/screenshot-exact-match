import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { consultBlackcatPix } from "../_shared/blackcat.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try {
  // Blackcat documentation does not specify a signed webhook. Never trust its status alone.
  const body=await req.json();
  const transactionId=body?.transactionId;
  if(typeof transactionId!=="string"||transactionId.length>128)return json({error:"Invalid transaction"},400);
  const url=Deno.env.get("SUPABASE_URL")!;
  const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:payment,error}=await admin.from("pix_transactions").select("order_id,amount_cents,status").eq("transaction_id",transactionId).maybeSingle();
  if(error||!payment)return json({error:"Unknown transaction"},404);
  const status=await consultBlackcatPix(transactionId);
  if(status.transactionId!==transactionId||status.amount!==payment.amount_cents)return json({error:"Gateway amount mismatch"},409);
  const next=status.status==="PAID"?"paid":status.status==="REFUNDED"?"refunded":status.status==="CANCELLED"?"cancelled":"pending";
  if(next==="paid"&&payment.status!=="paid") {
    const {error:updateError}=await admin.from("pix_transactions").update({status:"paid"}).eq("order_id",payment.order_id).eq("status","pending");
    if(updateError)return json({error:"Failed to persist payment"},500);
    const {error:orderError}=await admin.from("orders").update({payment_status:"paid",status:"paid"}).eq("id",payment.order_id).eq("payment_status","pending");
    if(orderError)return json({error:"Failed to update order"},500);
  } else if(next==="cancelled"||next==="refunded"){
    await admin.from("pix_transactions").update({status:next}).eq("order_id",payment.order_id);
    await admin.from("orders").update({payment_status:next}).eq("id",payment.order_id).neq("payment_status",next);
  }
  return json({ok:true});
 }catch{return json({error:"Could not verify gateway status"},503)}
});