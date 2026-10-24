import { act,cleanup,fireEvent,render,screen } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
import { captureRecoveryContact,markRecoveryCompleted,setRecoveryConsent,trackRecoveryCart } from "../lib/cart-recovery";
import { RecoveryConsent } from "../components/RecoveryConsent";

const invoke=vi.hoisted(()=>vi.fn().mockResolvedValue({data:{cartId:"local-cart"},error:null}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke}}}));
afterEach(()=>{cleanup();vi.clearAllTimers();vi.useRealTimers();vi.clearAllMocks();localStorage.clear();});

describe("Progressive recovery capture",()=>{
 it("records no CPF, delivery address or payment data and grants only explicit channel consent",async()=>{
  vi.useFakeTimers();const items=[{variantId:"local-variant",name:"PLA",color:"Branco",productSlug:"pla",price:59.9,quantity:1}];
  trackRecoveryCart(items);await act(async()=>{await vi.advanceTimersByTimeAsync(800);});
  expect(invoke).toHaveBeenCalledWith("recovery-carts",{body:expect.objectContaining({action:"sync",items:[{variant_id:"local-variant",quantity:1}]})});
  const form=document.createElement("form");
  for(const [name,value] of Object.entries({name:"Cliente local",email:"local@example.test",phone:"71999999999",cpf:"00000000000",street:"Rua privada",card_number:"never store"})){const input=document.createElement("input");input.name=name;input.value=value;form.append(input);}
  captureRecoveryContact(form);await act(async()=>{await vi.advanceTimersByTimeAsync(800);});
  const capture=invoke.mock.calls.at(-1)?.[1].body;
  expect(capture.contact).toEqual({name:"Cliente local",email:"local@example.test",phone:"71999999999"});
  expect(capture.consentChanges).toBeUndefined();expect(JSON.stringify(capture)).not.toContain("Rua privada");expect(JSON.stringify(capture)).not.toContain("card_number");expect(JSON.stringify(capture)).not.toContain("cpf");
  await setRecoveryConsent(form,"email",true);
  expect(invoke.mock.calls.at(-1)?.[1].body.consentChanges).toEqual({email:true});
  expect(JSON.stringify({...localStorage})).not.toContain("local@example.test");
  markRecoveryCompleted();const count=invoke.mock.calls.length;trackRecoveryCart(items);await act(async()=>{await vi.advanceTimersByTimeAsync(800);});expect(invoke).toHaveBeenCalledTimes(count);
 });
 it("starts with communication unchecked and makes consent optional for checkout",()=>{
  render(<form id="checkout-form"><RecoveryConsent/></form>);
  const checkboxes=screen.getAllByRole("checkbox");expect(checkboxes).toHaveLength(2);
  for(const input of checkboxes){expect(input).not.toBeChecked();expect(input).not.toBeRequired();}
  expect(screen.getByText(/A compra não depende destas autorizações/)).toBeInTheDocument();
 });
 it("resets authorization when the customer changes the destination",async()=>{
  render(<form id="checkout-form"><input name="email" aria-label="Contato" defaultValue="local@example.test"/><input name="phone" defaultValue="71999999999"/><RecoveryConsent/></form>);
  const consent=screen.getByRole("checkbox",{name:/por e-mail/});fireEvent.click(consent);await act(async()=>{});expect(consent).toBeChecked();
  fireEvent.input(screen.getByLabelText("Contato"),{target:{value:"changed@example.test"}});expect(consent).not.toBeChecked();
 });
});
