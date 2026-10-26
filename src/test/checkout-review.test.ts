import { describe,expect,it,vi } from "vitest";
import { reviewCheckoutItems } from "../lib/checkout-review";
const read=vi.hoisted(()=>vi.fn());
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({eq:read})})}}));
describe("Review before generating a payment",()=>{
 const item={variantId:"v1",name:"PLA",color:"Branco",productSlug:"pla",price:59.9,quantity:2};
 it("requires a new review if the current catalog price changes",async()=>{
  read.mockResolvedValue({data:[{name:"PLA atual",slug:"pla",price:69.9,images:[],product_variants:[{id:"v1",color:"Branco",stock:1}]}]});
  const result=await reviewCheckoutItems([item]);expect(result.changed).toBe(true);expect(result.current[0]).toMatchObject({price:69.9,quantity:2,stock:1});
 });
 it("removes inactive/unavailable variants without reserving stock",async()=>{
  read.mockResolvedValue({data:[]});expect(await reviewCheckoutItems([item])).toEqual({changed:true,current:[]});
 });
 it("fails before a payment request when the catalog cannot be verified",async()=>{
  read.mockResolvedValue({error:{message:"Unavailable"}});await expect(reviewCheckoutItems([item])).rejects.toThrow(/conferir os produtos/);
 });
});


it("refreshes category from the catalog instead of trusting a saved free-shipping flag", async () => {
  read.mockResolvedValue({ data: [{ name: "Produto", slug: "item", price: 500, categories: { slug: "acessorios" }, images: [], product_variants: [{ id: "v", color: "Padrão", stock: 1 }] }] });
  const result = await reviewCheckoutItems([{ variantId: "v", name: "Produto", productSlug: "item", color: "Padrão", price: 500, quantity: 1, categorySlug: "impressoras" }]);
  expect(result.changed).toBe(true);
  expect(result.current[0].categorySlug).toBe("acessorios");
});
