import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
export const adminClient=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
export const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Content-Type":"application/json"};
export const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
export async function userId(request:Request,required=false){
 const header=request.headers.get("Authorization") ?? "";
 if(!header.startsWith("Bearer ")){if(required)throw new Error("unauthorized");return null;}
 const {data,error}=await adminClient().auth.getUser(header.slice(7));
 if(error||!data.user){if(required)throw new Error("unauthorized");return null;}
 return data.user.id;
}
export async function requireAdmin(request:Request){
 const id=await userId(request,true);
 const {data,error}=await adminClient().from("user_roles").select("user_id").eq("user_id",id).eq("role","admin").maybeSingle();
 if(error||!data)throw new Error("unauthorized");return id;
}
export function publicOrigin(){const origin=Deno.env.get("RECOVERY_PUBLIC_ORIGIN") ?? "";const url=new URL(origin);if(url.protocol!=="https:"||url.origin!==origin)throw new Error("Public origin unavailable");return origin;}
