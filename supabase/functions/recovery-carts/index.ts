import { adminClient,cors,json,userId,requireAdmin,publicOrigin } from "../_shared/recovery-server.ts";
import { normalizeEmail,normalizePhone,randomToken,sha256,validToken,validateConfig } from "../_shared/recovery-rules.ts";

Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  if(Number(request.headers.get("content-length") ?? 0)>30000)return json({error:"Request too large"},413);
  const raw=await request.text();if(raw.length>30000)return json({error:"Request too large"},413);
  const body=JSON.parse(raw);const db=adminClient();
  if(["sync","resolve","unsubscribe"].includes(body.action)){
   const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
   const {data:allowed,error:rateError}=await db.rpc("recovery_rate_allow",{p_key:await sha256(`${ip}:${body.action}`),p_limit:ip==="unknown"?300:120});
   if(rateError)throw rateError;if(!allowed)return json({error:"Muitas solicitações. Tente novamente em um minuto."},429);
  }
  if(body.action==="sync"){
   if(!validToken(body.token)||!Array.isArray(body.items)||body.items.length>30)return json({error:"Carrinho inválido"},400);
   const quantities=new Map<string,number>();
   for(const item of body.items){if(typeof item.variant_id!=="string"||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10)return json({error:"Item inválido"},400);quantities.set(item.variant_id,(quantities.get(item.variant_id)??0)+item.quantity);}
   if([...quantities.values()].some(q=>q>10))return json({error:"Limite por cor excedido"},400);
   const ids=[...quantities.keys()];let items:unknown[]=[];
   if(ids.length){
    const {data,error}=await db.from("product_variants").select("id,color,products(id,name,slug,price,images,active,categories(slug))").in("id",ids);
    if(error)throw error;
    items=(data??[]).filter((v:any)=>v.products?.active).map((v:any)=>({variant_id:v.id,quantity:quantities.get(v.id),name:v.products.name,color:v.color,price:Number(v.products.price)}));
   }
   const contact=body.contact?{name:String(body.contact.name??"").slice(0,120),email:normalizeEmail(body.contact.email),phone:normalizePhone(body.contact.phone)}:null;
   if(contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))contact.email="";
   const consents:Record<string,unknown>={};
   for(const channel of ["email","whatsapp"]){if(body.consentChanges && typeof body.consentChanges[channel]==="boolean"){
    const destination=channel==="email"?contact?.email:contact?.phone;
    if(!destination)return json({error:"Informe um contato válido antes de autorizar este canal."},400);
    consents[channel]={granted:body.consentChanges[channel],contact_hash:await sha256(destination)};
   }}
   let parent=null;
   if(validToken(body.sourceToken)){
    const {data:link}=await db.from("recovery_links").select("cart_id").eq("token_hash",await sha256(body.sourceToken)).eq("kind","recover").gt("expires_at",new Date().toISOString()).maybeSingle();parent=link?.cart_id??null;
   }
   const {data,error}=await db.rpc("recovery_sync",{p_hash:await sha256(body.token),p_user:await userId(request),p_items:items,p_contact:contact,p_consents:consents,p_parent:parent});
   if(error)throw error;return json({cartId:data});
  }
  if(body.action==="resolve"||body.action==="unsubscribe"){
   if(!validToken(body.token))return json({error:"Link inválido ou expirado"},404);
   const kind=body.action==="resolve"?"recover":"unsubscribe";
   const {data:link,error}=await db.from("recovery_links").select("cart_id,channel,contact_hash").eq("token_hash",await sha256(body.token)).eq("kind",kind).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(error||!link)return json({error:"Link inválido ou expirado"},404);
   const {data:cart}=await db.from("recovery_carts").select("id,items,status,email,phone,linked_order_id,expires_at").eq("id",link.cart_id).single();
   if(!cart)return json({error:"Link inválido ou expirado"},404);
   if(kind==="unsubscribe"){
    const destinationHash=link.contact_hash;
    if(!destinationHash)return json({error:"Link indisponível"},404);
    const {error:stopError}=await db.rpc("recovery_stop",{p_cart:cart.id,p_channel:link.channel,p_hash:destinationHash});
    if(stopError)throw stopError;return json({ok:true});
   }
   if(cart.status==="recovered"||cart.status==="expired"||Date.parse(cart.expires_at)<=Date.now())return json({error:"Este carrinho já foi concluído ou expirou. Consulte seus pedidos em Minha conta."},410);
   if(cart.linked_order_id){const {data:order}=await db.from("orders").select("payment_method,payment_status,status").eq("id",cart.linked_order_id).single();if(order?.payment_method==="pix"&&["pending","pendente"].includes(order.payment_status)&&!["cancelado","cancelled"].includes(order.status))return json({error:"Já existe um Pix pendente para este carrinho. Consulte Minha conta antes de gerar outra cobrança."},409);}
   const ids=cart.items.map((item:any)=>item.variant_id);
   const {data:variants,error:variantError}=await db.from("product_variants").select("id,color,stock,products(id,name,slug,price,images,active,categories(slug))").in("id",ids);
   if(variantError)throw variantError;
   // Only current public catalog data is returned. Never return saved customer/contact fields.
   const items=(variants??[]).filter((v:any)=>v.products?.active).map((v:any)=>({variantId:v.id,categorySlug:v.products.categories?.slug,name:v.products.name,productSlug:v.products.slug,color:v.color,price:Number(v.products.price),image:v.products.images?.[0],stock:v.stock,quantity:Math.min(10,cart.items.find((item:any)=>item.variant_id===v.id)?.quantity??1)}));
   return json({items,removed:ids.length-items.length});
  }
  await requireAdmin(request);
  if(body.action==="link"){
   const {data:cart}=await db.from("recovery_carts").select("id,status,expires_at").eq("id",body.cartId).single();
   if(!cart||["recovered","expired"].includes(cart.status))return json({error:"Carrinho indisponível"},409);
   const token=randomToken();const {error}=await db.from("recovery_links").insert({token_hash:await sha256(token),cart_id:cart.id,kind:"recover",expires_at:cart.expires_at});
   if(error)throw error;return json({link:`${publicOrigin()}/recuperar#token=${token}`});
  }
  if(body.action==="cancel"){const {error}=await db.rpc("recovery_stop",{p_cart:body.cartId});if(error)throw error;return json({ok:true});}
  if(body.action==="delete"){const {error}=await db.from("recovery_carts").delete().eq("id",body.cartId);if(error)throw error;return json({ok:true});}
  if(body.action==="details"){
   const [{data:consents,error},{data:jobs}]=await Promise.all([db.from("recovery_consents").select("channel,granted,purpose,version,created_at").eq("cart_id",body.cartId).order("created_at",{ascending:false}),db.from("recovery_jobs").select("id,channel,step,state,attempts,due_at,result_code,dry_run").eq("cart_id",body.cartId).order("created_at",{ascending:false})]);
   if(error)throw error;return json({consents,jobs});
  }
  if(body.action==="retry"){
   const {data:job}=await db.from("recovery_jobs").select("id,state,attempts").eq("id",body.jobId).single();
   const {data:settings}=await db.from("recovery_settings").select("config").eq("id",true).single();
   if(!job||job.state!=="failed"||job.attempts>=(settings?.config?.max_attempts??3))return json({error:"Este envio não pode ser repetido com segurança."},409);
   const {error}=await db.from("recovery_jobs").update({state:"queued",due_at:new Date().toISOString(),result_code:"admin_retry"}).eq("id",job.id).eq("state","failed");if(error)throw error;return json({ok:true});
  }
  if(body.action==="settings"){
   const config=validateConfig(body.config);
   if(config.enabled&&!config.dry_run&&Deno.env.get("RECOVERY_LIVE_ENABLED")!=="true")return json({error:"Envios reais estão bloqueados no servidor. Conclua a configuração e a verificação dos provedores antes de ativar."},409);
   const {error}=await db.from("recovery_settings").update({config,updated_at:new Date().toISOString()}).eq("id",true);
   if(error)throw error;return json({ok:true});
  }
  if(body.action==="dashboard"){
   await db.rpc("recovery_reconcile");
   const page=Math.max(0,Math.floor(Number(body.page)||0));
   const {data:carts,error,count}=await db.from("recovery_carts").select("id,customer_name,email,phone,items,estimated_value,status,created_at,last_activity_at,abandoned_at,expires_at,recovered_value,recovered_at,sequence_cancelled,email_consent,whatsapp_consent,linked_order_id",{count:"exact"}).is("parent_id",null).order("last_activity_at",{ascending:false}).range(page*25,page*25+24);
   if(error)throw error;
   const [{data:settings},{data:jobs},{data:attempts},{data:metrics,error:metricsError},{data:scheduler}]=await Promise.all([
    db.from("recovery_settings").select("config").eq("id",true).single(),db.from("recovery_jobs").select("id,cart_id,channel,step,state,attempts,result_code,due_at,dry_run,completed_at").order("created_at",{ascending:false}).limit(100),
    db.from("recovery_attempts").select("cart_id,channel,result_code,http_status,created_at").order("created_at",{ascending:false}).limit(100),db.rpc("recovery_metrics"),db.rpc("recovery_scheduler_status")]);
   if(metricsError)throw metricsError;
   return json({carts,count,config:settings?.config,jobs,attempts,metrics,readiness:{scheduler,liveGate:Deno.env.get("RECOVERY_LIVE_ENABLED")==="true",publicOrigin:(()=>{try{return !!publicOrigin();}catch{return false;}})(),linkSecret:(Deno.env.get("RECOVERY_LINK_SECRET")?.length??0)>=32,whatsapp:!!(Deno.env.get("WHATSAPP_ACCESS_TOKEN")&&Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")&&Deno.env.get("WHATSAPP_WABA_ID")&&Deno.env.get("WHATSAPP_GRAPH_VERSION")&&Deno.env.get("WHATSAPP_APP_SECRET")&&Deno.env.get("WHATSAPP_VERIFY_TOKEN")),email:!!(Deno.env.get("RESEND_API_KEY")&&Deno.env.get("RECOVERY_EMAIL_FROM")&&Deno.env.get("RESEND_WEBHOOK_SECRET"))}});
  }
  return json({error:"Ação inválida"},400);
 }catch(error){if(error instanceof Error&&error.message==="Cart session unavailable")return json({error:"Sessão alterada. Autorize os lembretes novamente, se desejar.",code:"rotate_session"},409);return json({error:error instanceof Error&&error.message==="unauthorized"?"Acesso administrativo necessário":"Não foi possível executar esta operação de recuperação."},error instanceof Error&&error.message==="unauthorized"?401:503);}
});
