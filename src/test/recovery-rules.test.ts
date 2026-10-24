// @vitest-environment node
import { describe,expect,it,vi,afterEach } from "vitest";
import { inSendWindow,normalizePhone,randomToken,renderRecoveryText,sha256,signedToken,validToken,validateConfig,type RecoveryConfig } from "../../supabase/functions/_shared/recovery-rules";
import { verifyMeta,verifyResend } from "../../supabase/functions/_shared/recovery-webhook-signatures";
import { sendRecovery } from "../../supabase/functions/_shared/recovery-providers";

const cfg:RecoveryConfig={enabled:false,dry_run:true,whatsapp_enabled:false,email_enabled:false,timezone:"America/Bahia",start_hour:9,end_hour:20,retention_days:30,max_attempts:3,suppress_pending_pix:true,email_from:"",steps:[30,1440,4320].map(minutes=>({minutes,subject:"Seu carrinho",text:"Olá, {nome}! {link_recuperacao}",wa_template:"recovery",wa_language:"pt_BR"}))};
afterEach(()=>{vi.unstubAllGlobals();});
describe("Recovery rules and provider safety",()=>{
 it("blocks overnight sending in the store timezone and respects the closing boundary",()=>{
  expect(inSendWindow(cfg,new Date("2026-10-23T06:00:00Z"))).toBe(false);
  expect(inSendWindow(cfg,new Date("2026-10-23T12:00:00Z"))).toBe(true);
  expect(inSendWindow(cfg,new Date("2026-10-23T23:00:00Z"))).toBe(false);
 });
 it("rejects overnight windows, excessive retention and invalid sequence intervals",()=>{
  expect(()=>validateConfig({...cfg,start_hour:0})).toThrow();expect(()=>validateConfig({...cfg,retention_days:91})).toThrow();
  expect(()=>validateConfig({...cfg,steps:[cfg.steps[0]!,cfg.steps[0]!,cfg.steps[2]!]})).toThrow();
  expect(validateConfig(cfg)).toEqual(cfg);
 });
 it("normalizes contact without accepting invalid phone values",()=>{expect(normalizePhone("(71) 99999-9999")).toBe("5571999999999");expect(normalizePhone("123")).toBe("");});
 it("creates opaque tokens and deterministic per-job recovery capabilities without personal data",async()=>{
  const token=randomToken();expect(validToken(token)).toBe(true);expect(validToken("email@example.test")).toBe(false);
  expect(await signedToken("test-key", "recover:job-1")).toBe(await signedToken("test-key","recover:job-1"));
  expect(await signedToken("test-key","unsubscribe:job-1")).not.toBe(await signedToken("test-key","recover:job-1"));
  expect(await sha256(token)).not.toContain(token);
 });
 it("renders the first name and the original recovery URL without adding discounts or urgency",()=>{expect(renderRecoveryText(cfg.steps[0]!.text,"Maria Silva","https://shop.test/recuperar#token=opaque")).toBe("Olá, Maria! https://shop.test/recuperar#token=opaque");});
 it("rejects forged or expired webhook signatures",async()=>{
  const raw='{"event":"test"}',secret="local-test-key";
  expect(await verifyMeta(raw,`sha256=${await signedToken(secret,raw)}`,secret)).toBe(true);
  expect(await verifyMeta(raw,"sha256="+"0".repeat(64),secret)).toBe(false);
  expect(await verifyResend(raw,"id","1","v1,ZmFrZQ==","whsec_dGVzdA==")).toBe(false);
 });
 it("never sends when credentials or sender verification are missing",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);vi.stubGlobal("Deno",{env:{get:()=>undefined}});
  expect((await sendRecovery("email",cfg,cfg.steps[0]!,"local@example.test","Teste","https://shop.test/link","https://shop.test/optout","job")).state).toBe("failed");
  expect((await sendRecovery("whatsapp",cfg,cfg.steps[0]!,"5571999999999","Teste","https://shop.test/link","https://shop.test/optout","job")).state).toBe("failed");
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("requires an approved WhatsApp model before posting a message",async()=>{
  const env:Record<string,string>={WHATSAPP_ACCESS_TOKEN:"local-test",WHATSAPP_PHONE_NUMBER_ID:"123",WHATSAPP_WABA_ID:"456",WHATSAPP_GRAPH_VERSION:"v25.0",WHATSAPP_APP_SECRET:"local-test"};
  vi.stubGlobal("Deno",{env:{get:(key:string)=>env[key]}});
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({data:[{name:"recovery",status:"PENDING",language:"pt_BR"}]})});vi.stubGlobal("fetch",fetcher);
  expect((await sendRecovery("whatsapp",cfg,cfg.steps[0]!,"5571999999999","Teste","https://shop.test/link","https://shop.test/optout","job")).code).toContain("approved_template");
  expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]?.[1]?.method).not.toBe("POST");
 });
 it("classifies ambiguous provider outcomes for manual review instead of auto-retrying",async()=>{
  const env:Record<string,string>={WHATSAPP_ACCESS_TOKEN:"local-test",WHATSAPP_PHONE_NUMBER_ID:"123",WHATSAPP_WABA_ID:"456",WHATSAPP_GRAPH_VERSION:"v25.0",WHATSAPP_APP_SECRET:"local-test"};
  vi.stubGlobal("Deno",{env:{get:(key:string)=>env[key]}});vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("timeout")));
  expect((await sendRecovery("whatsapp",cfg,cfg.steps[0]!,"5571999999999","Teste","https://shop.test/link","https://shop.test/optout","job")).state).toBe("uncertain");
 });
});
