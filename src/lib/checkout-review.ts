import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "./cart";

// Public, read-only review. Price/stock authority remains the existing place_order RPC.
export async function reviewCheckoutItems(items:CartItem[]){
 const {data,error}=await supabase.from("products").select("id,name,slug,price,images,active,product_variants(id,color,stock)").eq("active",true);
 if(error)throw new Error("Não foi possível conferir os produtos atuais. Tente novamente antes de gerar o pagamento.");
 const variants=new Map((data??[]).flatMap(product=>product.product_variants.map(variant=>[variant.id,{product,variant}] as const)));
 let changed=false;
 const current=items.flatMap(item=>{
  const found=variants.get(item.variantId);if(!found){changed=true;return [];}
  const price=Number(found.product.price);if(price!==item.price)changed=true;
  return [{...item,price,name:found.product.name,productSlug:found.product.slug,color:found.variant.color,stock:found.variant.stock,image:found.product.images?.[0]}];
 });
 return {changed,current};
}
