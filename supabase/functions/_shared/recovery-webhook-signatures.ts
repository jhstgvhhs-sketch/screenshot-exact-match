import { signedToken } from "./recovery-rules.ts";
export async function verifyMeta(raw:string,signature:string,secret:string){
 if(!secret||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
 return signature===`sha256=${await signedToken(secret,raw)}`;
}
export async function verifyResend(raw:string,id:string,timestamp:string,signature:string,secret:string,now=Date.now()){
 const seconds=Number(timestamp);if(!secret||!id||!Number.isFinite(seconds)||Math.abs(now/1000-seconds)>300)return false;
 try{
  const key=await crypto.subtle.importKey("raw",Uint8Array.from(atob(secret.replace(/^whsec_/,"")),c=>c.charCodeAt(0)),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const value=new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
  for(const pair of signature.split(" ")){const [version,encoded]=pair.split(",");if(version==="v1"&&encoded&&await crypto.subtle.verify("HMAC",key,Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),value))return true;}
 }catch{/* Invalid signatures are rejected without logging payloads. */}
 return false;
}
