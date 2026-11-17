// Blackcat Pix retired for new checkout sessions. Historical webhook remains deployed
// temporarily so payments created before migration can still be reconciled.
Deno.serve((req)=>new Response(JSON.stringify({error:"Pix Blackcat desativado. Atualize a página e gere uma nova cobrança pela BluePag."}),{status:410,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}}));
