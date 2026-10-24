import { adminClient,cors,json,requireAdmin,publicOrigin } from "../_shared/recovery-server.ts";
import { equalSecret,inSendWindow,sha256,signedToken,validateConfig } from "../_shared/recovery-rules.ts";
import { sendRecovery } from "../_shared/recovery-providers.ts";

Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const body=await request.json().catch(()=>({}));
  if(body.testRun===true)await requireAdmin(request);
  else if(!await equalSecret(request.headers.get("Authorization")?.replace(/^Bearer /,"")??"",Deno.env.get("RECOVERY_CRON_SECRET")??""))return json({error:"Unauthorized"},401);
  const db=adminClient();const {data:settings,error}=await db.from("recovery_settings").select("config").eq("id",true).single();
  if(error)throw error;const cfg=validateConfig(settings.config);
  if(body.testRun===true&&!cfg.dry_run)return json({error:"Ative o modo de testes antes de simular."},409);
  const {error:tickError}=await db.rpc("recovery_tick");if(tickError)throw tickError;
  if(!cfg.enabled)return json({ok:true,processed:0,reason:"automation_disabled"});
  if(!cfg.dry_run&&Deno.env.get("RECOVERY_LIVE_ENABLED")!=="true")return json({ok:true,processed:0,reason:"live_server_gate_disabled"});
  if(!(body.testRun===true&&cfg.dry_run)&&!inSendWindow(cfg))return json({ok:true,processed:0,reason:"outside_send_window"});
  const secret=Deno.env.get("RECOVERY_LINK_SECRET");
  if(!cfg.dry_run&&(!secret||secret.length<32))return json({error:"Link configuration missing"},503);
  const claimId=crypto.randomUUID();const {data:jobs,error:claimError}=await db.rpc("recovery_claim",{p_claim:claimId});if(claimError)throw claimError;
  let processed=0;
  for(const job of jobs??[]){
   if(!(body.testRun===true&&cfg.dry_run)&&!inSendWindow(cfg)){
    await db.from("recovery_jobs").update({state:"queued",attempts:Math.max(0,job.attempts-1),result_code:"deferred_send_window",due_at:new Date(Date.now()+60000).toISOString()}).eq("id",job.id).eq("claim_id",claimId).eq("state","claimed");continue;
   }
   const {data:eligible,error:eligibleError}=await db.rpc("recovery_eligible",{p_job:job.id});
   if(eligibleError||!eligible)continue;
   const {data:cart,error:cartError}=await db.from("recovery_carts").select("id,email,phone,customer_name,expires_at").eq("id",job.cart_id).single();
   if(cartError||!cart)continue;
   let result:{state:string;code:string;http?:number;providerId?:string}={state:"simulated",code:"dry_run_no_message_sent"};
   if(!cfg.dry_run){
    const recoveryToken=await signedToken(secret!,`recover:${job.id}`),unsubscribeToken=await signedToken(secret!,`unsubscribe:${job.id}`);
    const {error:linksError}=await db.from("recovery_links").upsert([
     {token_hash:await sha256(recoveryToken),cart_id:cart.id,kind:"recover",expires_at:cart.expires_at},
     {token_hash:await sha256(unsubscribeToken),cart_id:cart.id,kind:"unsubscribe",channel:job.channel,contact_hash:await sha256(job.channel==="email"?cart.email:cart.phone),expires_at:new Date(Date.parse(job.created_at)+cfg.retention_days*86400000).toISOString()}
    ],{onConflict:"token_hash"});
    if(linksError)continue;
    // Re-read consent/payment/settings immediately before the irreversible provider call.
    const {data:stillEligible,error:preflightError}=await db.rpc("recovery_eligible",{p_job:job.id});
    if(preflightError||!stillEligible)continue;
    result=await sendRecovery(job.channel,cfg,cfg.steps[job.step],job.channel==="email"?cart.email:cart.phone,cart.customer_name,`${publicOrigin()}/recuperar#token=${recoveryToken}`,`${publicOrigin()}/descadastrar#token=${unsubscribeToken}`,job.id);
   }
   if(result.state==="queued"&&job.attempts>=cfg.max_attempts)result={...result,state:"failed",code:"attempt_limit_reached"};
   const nextDue=new Date(Date.now()+60000*2**job.attempts).toISOString();
   await db.from("recovery_jobs").update({state:result.state,provider_id:result.providerId??null,result_code:result.code,completed_at:result.state==="queued"?null:new Date().toISOString(),...(result.state==="queued"?{due_at:nextDue}:{})}).eq("id",job.id).eq("claim_id",claimId).eq("state","claimed");
   await db.from("recovery_attempts").insert({job_id:job.id,cart_id:cart.id,channel:job.channel,result_code:result.code,http_status:result.http??null});
   processed++;
  }
  return json({ok:true,processed,dryRun:cfg.dry_run});
 }catch{return json({error:"Recovery worker unavailable"},503);}
});
