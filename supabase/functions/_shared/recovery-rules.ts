export type RecoveryStep = { minutes: number; subject: string; text: string; wa_template: string; wa_language: string };
export type RecoveryConfig = {
 enabled: boolean; dry_run: boolean; whatsapp_enabled: boolean; email_enabled: boolean;
 timezone: string; start_hour: number; end_hour: number; retention_days: number; max_attempts: number;
 suppress_pending_pix: boolean; email_from: string; steps: RecoveryStep[];
};
export const PURPOSE = "Recuperação do carrinho 3DFLEX";
export const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase().slice(0,160);
export function normalizePhone(value: unknown) {
 const digits=String(value ?? "").replace(/\D/g, "");
 const full=digits.length===10 || digits.length===11 ? `55${digits}` : digits;
 return /^\d{11,15}$/.test(full) ? full : "";
}
export function validateConfig(value: RecoveryConfig): RecoveryConfig {
 if (!value || typeof value!=="object") throw new Error("Configuração inválida");
 for(const key of ["enabled","dry_run","whatsapp_enabled","email_enabled","suppress_pending_pix"] as const)
  if(typeof value[key]!=="boolean") throw new Error("Configuração inválida");
 if(!Number.isInteger(value.start_hour)||!Number.isInteger(value.end_hour)||value.start_hour<8||value.end_hour>22||value.end_hour<=value.start_hour)
  throw new Error("Escolha uma janela entre 08h e 22h, com início anterior ao fim.");
 new Intl.DateTimeFormat("pt-BR",{timeZone:value.timezone}).format(new Date());
 if(!Number.isInteger(value.retention_days)||value.retention_days<7||value.retention_days>30) throw new Error("Retenção: de 7 a 30 dias.");
 if(!Number.isInteger(value.max_attempts)||value.max_attempts<1||value.max_attempts>3) throw new Error("Tentativas: de 1 a 3.");
 if(!Array.isArray(value.steps)||value.steps.length!==3) throw new Error("Configure exatamente três etapas.");
 let previous=0;
 for(const step of value.steps){
  if(!Number.isInteger(step.minutes)||step.minutes<30||step.minutes>8640||step.minutes<=previous) throw new Error("Os intervalos devem ser crescentes, de 30 minutos a 6 dias após o abandono.");
  previous=step.minutes;
  if(typeof step.text!=="string"||step.text.length>3000||!step.text.includes("{link_recuperacao}")||typeof step.subject!=="string"||!step.subject.trim()||step.subject.length>150) throw new Error("Cada etapa precisa de assunto e texto com {link_recuperacao}.");
  if(!/^[a-z0-9_]{0,100}$/.test(step.wa_template)||!/^\w{2,10}$/.test(step.wa_language)) throw new Error("Modelo WhatsApp ou idioma inválido.");
 }
 if(value.email_from && !/^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(value.email_from)) throw new Error("Informe um remetente válido, sem nome ou sinais < >.");
 return value;
}
export function inSendWindow(config: Pick<RecoveryConfig,"timezone"|"start_hour"|"end_hour">,now=new Date()) {
 const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:config.timezone,hour:"2-digit",hourCycle:"h23"}).format(now));
 return hour>=config.start_hour && hour<config.end_hour;
}
export function renderRecoveryText(text:string,name:string,link:string) {
 return text.replaceAll("{nome}",name.trim().split(/\s+/)[0] || "cliente").replaceAll("{link_recuperacao}",link);
}
export const validToken=(token:unknown):token is string=>typeof token==="string"&&/^[A-Za-z0-9_-]{43,128}$/.test(token);
export async function sha256(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,"0")).join("");}
export async function signedToken(secret:string,value:string){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,"0")).join("");
}
export async function equalSecret(a:string,b:string){return Boolean(b)&&await sha256(a)===await sha256(b);}
