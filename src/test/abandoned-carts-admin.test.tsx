import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { AbandonedCarts } from "../components/site/AbandonedCarts";
const api=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/cart-recovery",()=>({recoveryRequest:api}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:vi.fn()}}}));
const config={enabled:false,dry_run:true,whatsapp_enabled:false,email_enabled:false,timezone:"America/Bahia",start_hour:9,end_hour:20,retention_days:30,max_attempts:3,suppress_pending_pix:true,email_from:"",steps:[30,1440,4320].map(minutes=>({minutes,subject:"Seu carrinho",text:"Olá, {nome}! {link_recuperacao}",wa_template:"",wa_language:"pt_BR"}))};
const data={carts:[{id:"local-cart",customer_name:"Cliente local de teste",email:"local@example.test",phone:"",items:[{name:"PLA",color:"Branco",quantity:2,price:59.9}],estimated_value:119.8,status:"abandoned",last_activity_at:"2026-10-23T12:00:00Z",expires_at:"2026-10-30T12:00:00Z",email_consent:true,whatsapp_consent:false,sequence_cancelled:false,linked_order_id:null}],count:1,config,jobs:[],attempts:[],metrics:{abandoned:1,potential:119.8,recovered:0,revenue:0,rate:0},readiness:{scheduler:{sweep:false,dispatch:false},liveGate:false,publicOrigin:false,linkSecret:false,whatsapp:false,email:false}};
let client:QueryClient;
beforeEach(()=>{api.mockImplementation(async body=>body.action==="dashboard"?data:body.action==="link"?{link:"https://shop.test/recuperar#token=opaque"}:{ok:true});client=new QueryClient({defaultOptions:{queries:{retry:false,retryDelay:0,gcTime:0}}});});
afterEach(()=>{cleanup();client.clear();vi.clearAllMocks();});
const show=()=>render(<QueryClientProvider client={client}><AbandonedCarts/></QueryClientProvider>);
describe("Abandoned carts administration",()=>{
 it("shows real-data metrics and safe link generation without personal data in the URL",async()=>{
  show();expect(await screen.findByText("Cliente local de teste")).toBeInTheDocument();expect(screen.getByText("Valor potencial")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Gerar link seguro"}));
  const link=await screen.findByLabelText("Link de recuperação");expect(link).toHaveValue("https://shop.test/recuperar#token=opaque");expect((link as HTMLInputElement).value).not.toContain("local@example.test");
  expect(screen.getByText(/MODO DE TESTES/)).toBeInTheDocument();
 });
 it("saves configuration without turning on live sending",async()=>{
  show();const button=await screen.findByRole("button",{name:"Salvar automação"});fireEvent.click(button);
  await waitFor(()=>expect(api).toHaveBeenCalledWith({action:"settings",config:expect.objectContaining({enabled:false,dry_run:true})}));
 });
 it("isolates backend failure from the existing checkout and explains deployment is pending",async()=>{
  api.mockRejectedValue(new Error("Offline"));show();expect(await screen.findByRole("alert")).toHaveTextContent("Carrinho, checkout e pagamentos continuam funcionando");
 });
});
