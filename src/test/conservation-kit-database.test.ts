// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
type TestOrder = {
  gift_items: { name: string; quantity: number; unit: string }[];
  total: string;
  discount: string;
  shipping: string;
  coupon_code: string | null;
};
const db = new PGlite();
const user = "11111111-1111-4111-8111-111111111111";
const ids = [1, 2, 3, 4].map((i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
const item = (i: number, q: number) => ({ variant_id: ids[i], quantity: q });
let sql: string;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table products(id uuid primary key,brand text,material text,weight text,active boolean,name text,price numeric);
 create table product_variants(id uuid primary key,product_id uuid,color text,sku text,stock integer);
 create table coupons(id uuid default gen_random_uuid(),code text unique,percent_off numeric check(percent_off>0),amount_off numeric check(amount_off>0),active boolean,expires_at timestamptz);
 create table orders(id uuid primary key default gen_random_uuid(),user_id uuid,payment_method text,customer_name text,customer_email text,customer_phone text,customer_cpf text,ship_cep text,ship_street text,ship_number text,ship_complement text,ship_district text,ship_city text,ship_state text,subtotal numeric,shipping numeric,total numeric,discount numeric,coupon_code text);
 create table order_items(order_id uuid,product_id uuid,variant_id uuid,product_name text,color text,sku text,unit_price numeric,quantity integer,reserved_stock integer);
 insert into products values ('${ids[0]}','MasterPrint','PLA','1 kg',true,'PLA',59.90),('${ids[1]}','MasterPrint','PETG','1kg',true,'PETG',69.90),('${ids[2]}','Outra','PLA','1kg',true,'MasterPrint no nome',30),('${ids[3]}','MasterPrint','PLA','500 g',true,'Meio quilo',40);
 insert into product_variants select id,id,'Preto','SKU',100 from products;
 grant select on products,product_variants to anon,authenticated;
 select set_config('test.uid','${user}',false);`);
  sql = await readFile(
    new URL(
      "../../supabase/migrations/20261024172652_kit_conservation_coupon.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
afterAll(() => db.close());
const preview = async (items: unknown[]) =>
  (
    await db.query<{ result: { kilograms: number; kits: number; gifts: unknown[] } }>(
      "select kit_conservation_preview($1::jsonb) result",
      [JSON.stringify(items)],
    )
  ).rows[0].result;
const order = async (
  items: unknown[],
  coupon: string,
  method = "pix",
  customer: Record<string, string> = {},
) =>
  (
    await db.query<{ id: string }>("select place_order($1::jsonb,$2::jsonb,$3,$4) id", [
      JSON.stringify(items),
      JSON.stringify(customer),
      coupon,
      method,
    ])
  ).rows[0].id;
describe("Kit conservation — isolated database", () => {
  it.each([
    [4, 0],
    [5, 1],
    [9, 1],
    [10, 2],
  ])("calculates %s kg as %s full kits", async (q, kits) => {
    expect((await preview([item(0, q)])).kits).toBe(kits);
  });
  it("combines materials/colors and counts grams correctly, excluding other brands", async () => {
    expect((await preview([item(0, 10), item(1, 5)])).kits).toBe(3);
    expect((await preview([item(3, 10)])).kits).toBe(1);
    expect((await preview([item(0, 4), item(2, 10)])).kits).toBe(0);
  });
  it("persists escalating gifts without modifying totals or creating stock-bearing gift lines", async () => {
    const id = await order([item(0, 10), item(1, 5)], "kitconservação");
    const row = (await db.query<TestOrder>("select * from orders where id=$1", [id])).rows[0];
    expect(row.gift_items).toEqual([
      { name: "Sílica em gel", quantity: 3, unit: "kg" },
      { name: "Embalagens a vácuo", quantity: 15, unit: "unidades" },
    ]);
    expect(Number(row.total)).toBe(948.5);
    expect(Number(row.discount)).toBe(0);
    expect(Number(row.shipping)).toBe(0);
    expect(row.coupon_code).toBe("KITCONSERVACAO");
    expect((await db.query("select * from order_items where order_id=$1", [id])).rows).toHaveLength(
      2,
    );
  });
  it("supports existing Pix customer passthrough and card coupon argument", async () => {
    const pix = await order([item(0, 5)], "", "pix", { coupon_code: "kitconservaçao" });
    const card = await order([item(0, 5)], "KITCONSERVACAO", "cartao");
    for (const id of [pix, card]) {
      const row = (
        await db.query<TestOrder>("select gift_items,shipping,total from orders where id=$1", [id])
      ).rows[0];
      expect(row.gift_items[0].quantity).toBe(1);
      expect(Number(row.shipping)).toBe(37.8);
      expect(Number(row.total)).toBe(337.3);
    }
  });
  it("rejects ineligible coupons atomically without consuming stock or leaving orders", async () => {
    const before = (
      await db.query(
        "select (select count(*) from orders) orders,(select sum(stock) from product_variants) stock",
      )
    ).rows;
    await expect(order([item(0, 4)], "KITCONSERVACAO")).rejects.toThrow(/5 kg/);
    expect(
      (
        await db.query(
          "select (select count(*) from orders) orders,(select sum(stock) from product_variants) stock",
        )
      ).rows,
    ).toEqual(before);
  });
  it("preserves orders without coupon and existing percentage coupons", async () => {
    await db.exec("insert into coupons(code,percent_off,active) values ('SAVE10',10,true)");
    const plain = await order([item(0, 5)], "");
    const discounted = await order([item(0, 5)], "SAVE10");
    const rows = (
      await db.query<TestOrder>(
        "select total,gift_items from orders where id=any($1::uuid[]) order by total",
        [[plain, discounted]],
      )
    ).rows;
    expect(rows.map((r) => Number(r.total))).toEqual([307.35, 337.3]);
    expect(rows.every((r) => r.gift_items.length === 0)).toBe(true);
  });
  it("blocks duplicate quantities and unauthenticated creation", async () => {
    await expect(preview([item(0, 5), item(0, 5)])).rejects.toThrow(/mesma cor/);
    await expect(order([item(0, 11)], "KITCONSERVACAO")).rejects.toThrow(/10 unidades/);
    await db.exec("select set_config('test.uid','',false)");
    await expect(order([item(0, 5)], "KITCONSERVACAO")).rejects.toThrow(/login/);
    await db.exec(`select set_config('test.uid','${user}',false)`);
  });
});
