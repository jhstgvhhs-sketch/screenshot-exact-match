// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111",
  customer = "22222222-2222-4222-8222-222222222222",
  product = "33333333-3333-4333-8333-333333333333",
  variant = "44444444-4444-4444-8444-444444444444";
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create type app_role as enum('admin','user');
    create function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable as $$select _user_id='${admin}'::uuid and _role='admin'$$;
    grant usage on schema auth to anon,authenticated;
    create table products(id uuid primary key);
    create table product_variants(id uuid primary key,product_id uuid references products on delete cascade);
    create table order_items(id uuid primary key default gen_random_uuid(),product_id uuid,variant_id uuid);
    create table product_reviews(id uuid primary key default gen_random_uuid(),product_id uuid references products on delete cascade);
    grant select,update,delete on products,product_variants to authenticated;
    grant select on order_items,product_reviews to authenticated;
    alter table products enable row level security;alter table product_variants enable row level security;
    alter table order_items enable row level security;alter table product_reviews enable row level security;
    create policy admin_products on products for all to authenticated using(has_role(auth.uid(),'admin'));
    create policy admin_variants on product_variants for all to authenticated using(has_role(auth.uid(),'admin'));
    create policy admin_items on order_items for select to authenticated using(has_role(auth.uid(),'admin'));
    create policy admin_reviews on product_reviews for select to authenticated using(has_role(auth.uid(),'admin'));`);
  const sql = await readFile(
    new URL(
      "../../supabase/migrations/20261026181606_admin_delete_unused_product.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role;truncate products,product_variants,order_items,product_reviews;
  insert into products values('${product}');insert into product_variants values('${variant}','${product}');
  select set_config('test.uid','${admin}',false);set role authenticated;`);
});
afterAll(() => db.close());
const remove = () => db.query("select admin_delete_unused_product($1) deleted", [product]);
describe("Server product deletion guards", () => {
  it("deletes an unused product and its variants for an authorized admin", async () => {
    expect((await remove()).rows).toEqual([{ deleted: true }]);
    expect((await db.query("select * from product_variants")).rows).toHaveLength(0);
  });
  it.each(["product", "variant"])("preserves order history linked by %s", async (link) => {
    await db.exec("reset role");
    await db.query("insert into order_items(product_id,variant_id) values($1,$2)", [
      link === "product" ? product : null,
      link === "variant" ? variant : null,
    ]);
    await db.exec("set role authenticated");
    await expect(remove()).rejects.toThrow(/pedidos vinculados/);
    expect((await db.query("select * from products")).rows).toHaveLength(1);
    expect((await db.query("select * from order_items")).rows).toHaveLength(1);
  });
  it("preserves reviews instead of cascading their deletion", async () => {
    await db.exec("reset role");
    await db.query("insert into product_reviews(product_id) values($1)", [product]);
    await db.exec("set role authenticated");
    await expect(remove()).rejects.toThrow(/possui avaliações/);
    expect((await db.query("select * from product_reviews")).rows).toHaveLength(1);
  });
  it("blocks customers and anonymous callers in the backend", async () => {
    await db.exec(`select set_config('test.uid','${customer}',false)`);
    await expect(remove()).rejects.toThrow(/administrativo/);
    await db.exec("reset role;set role anon");
    await expect(remove()).rejects.toThrow(/permission denied/);
  });
});
