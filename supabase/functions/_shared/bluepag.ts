const BASE = "https://api.bluepag.com.br/api/v1";
let cachedToken: { value: string; expiresAt: number } | null = null;
async function accessToken(): Promise<string> {
 const clientId=Deno.env.get("BLUEPAG_CLIENT_ID"), clientSecret=Deno.env.get("BLUEPAG_CLIENT_SECRET");
 if(!clientId||!clientSecret)throw new Error("BluePag credentials missing");
 if(cachedToken&&cachedToken.expiresAt>Date.now()+60_000)return cachedToken.value;
 const basic=btoa(`${clientId}:${clientSecret}`);
 const response=await fetch(`${BASE}/oauth/token`,{method:"POST",headers:{accept:"application/json",authorization:`Basic ${basic}`,"content-type":"application/json"},body:JSON.stringify({grant_type:"client_credentials"})});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.access_token)throw new Error("BluePag authentication failed");
 cachedToken={value:result.access_token,expiresAt:Date.now()+Math.max(60,Number(result.expires_in??3600))*1000};
 return cachedToken.value;
}
export async function createBluePagPix(input:{amount:number;payer_name:string;payer_email:string;payer_cpf:string;description:string;postback_url:string}) {
 const token=await accessToken();
 const response=await fetch(`${BASE}/payments/pix`,{method:"POST",headers:{accept:"application/json",authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(input)});
 const result=await response.json().catch(()=>null), data=result?.data;
 if(!response.ok||result?.success!==true||typeof data?.transaction_uuid!=="string"||typeof data?.pix_code!=="string"||!data.pix_code.trim())throw new Error("BluePag charge creation failed");
 return {transactionId:data.transaction_uuid as string,copyPaste:data.pix_code as string};
}
export async function getBluePagPayment(uuid:string) {
 const token=await accessToken();
 const response=await fetch(`${BASE}/payments/${encodeURIComponent(uuid)}`,{headers:{accept:"application/json",authorization:`Bearer ${token}`}});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.success!==true||result?.data?.uuid!==uuid)throw new Error("BluePag payment lookup failed");
 return result.data as {uuid:string;type:string;status:string;amount_gross:number;amount?:number};
}
