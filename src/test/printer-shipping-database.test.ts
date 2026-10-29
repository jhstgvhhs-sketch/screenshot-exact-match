// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const printer = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create type app_role as enum ('admin', 'user');
    create function has_role(_user_id uuid, _role app_role) returns boolean language sql stable as $select false$;
    create function auth.uid() returns uuid language sql as $$select '11111111-1111-4111-8111-111111111111'::uuid$$;
    create table categories(id uuid primary key,slug text);
    create table products(id uuid primary key,brand text,material text,weight text,active boolean,name text,price numeric,category_id uuid);
    create table product_variants(id uuid primary key,product_id uuid,color text,sku text,stock integer);
    create table coupons(id uuid default gen_random_uuid(),code text unique,percent_off numeric,amount_off numeric,active boolean,expires_at timestamptz);
    create table orders(id uuid primary key default gen_random_uuid(),user_id uuid,payment_method text,customer_name text,customer_email text,customer_phone text,customer_cpf text,ship_cep text,ship_street text,ship_number text,ship_complement text,ship_district text,ship_city text,ship_state text,subtotal numeric,shipping numeric,total numeric,discount numeric,coupon_code text);
    create table order_items(order_id uuid,product_id uuid,variant_id uuid,product_name text,color text,sku text,unit_price numeric,quantity integer,reserved_stock integer);
    insert into categories values ('${printer}','impressoras'),('${other}','acessorios');
    insert into products values ('${printer}',null,null,null,true,'Modelo cadastrado',500,'${printer}'),('${other}',null,null,null,true,'Impressora no nome mas acessório',60,'${other}');
    insert into product_variants select id,id,'Padrão','SKU',100 from products;`);
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261024172652_kit_conservation_coupon.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20261026211525_free_shipping_printer_orders.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  await db.exec(
    await readFile(
      new URL("../../supabase/migrations/20261028000001_configurable_shipping.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(() => db.close());
async function place(items: { variant_id: string; quantity: number }[], method: string) {
  const result = await db.query<{ id: string }>(
    "select place_order($1::jsonb,'{}'::jsonb,'',$2) id",
    [JSON.stringify(items), method],
  );
  return (
    await db.query<{ shipping: string; total: string }>(
      "select shipping,total from orders where id=$1",
      [result.rows[0].id],
    )
  ).rows[0];
}
describe("Printer freight — isolated checkout database", () => {
  it.each(["pix", "cartao"])("keeps printer and mixed orders free with %s", async (method) => {
    expect(Number((await place([{ variant_id: printer, quantity: 1 }], method)).shipping)).toBe(0);
    const mixed = await place(
      [
        { variant_id: printer, quantity: 1 },
        { variant_id: other, quantity: 1 },
      ],
      method,
    );
    expect(Number(mixed.shipping)).toBe(0);
    expect(Number(mixed.total)).toBe(560);
  });

  it("uses admin-configured freight in the authoritative order RPC", async () => {
    await db.exec(
      "update shipping_settings set fixed_shipping_brl=12.34, free_pix_shipping_enabled=true, free_pix_shipping_threshold_brl=50 where id='main'",
    );
    const freePix = await place([{ variant_id: other, quantity: 1 }], "pix");
    expect(Number(freePix.shipping)).toBe(0);

    const card = await place([{ variant_id: other, quantity: 1 }], "cartao");
    expect(Number(card.shipping)).toBe(12.34);
    expect(Number(card.total)).toBe(72.34);

    await db.exec("update shipping_settings set free_pix_shipping_enabled=false where id='main'");
    const regularPix = await place([{ variant_id: other, quantity: 1 }], "pix");
    expect(Number(regularPix.shipping)).toBe(12.34);

    await db.exec("update shipping_settings set fixed_shipping_brl=0 where id='main'");
    const zeroFreight = await place([{ variant_id: other, quantity: 1 }], "cartao");
    expect(Number(zeroFreight.shipping)).toBe(0);
  });

  it("preserves other cart rules and ignores invented browser flags", async () => {
    const normal = await place([{ variant_id: other, quantity: 1 }], "pix");
    expect(Number(normal.shipping)).toBe(37.8);
    expect(Number(normal.total)).toBe(97.8);
    expect(Number((await place([{ variant_id: other, quantity: 10 }], "pix")).shipping)).toBe(37.8);
    expect(Number((await place([{ variant_id: other, quantity: 10 }], "cartao")).shipping)).toBe(
      37.8,
    );
    const before = (await db.query("select count(*) from orders")).rows;
    await expect(place([{ variant_id: printer, quantity: 11 }], "pix")).rejects.toThrow();
    expect((await db.query("select count(*) from orders")).rows).toEqual(before);
  });
});
