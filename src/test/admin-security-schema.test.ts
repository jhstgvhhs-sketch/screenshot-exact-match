// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const A = "11111111-1111-4111-8111-111111111111",
  C = "22222222-2222-4222-8222-222222222222";
let product: string, order: string;
async function one(sql: string, args: unknown[] = []) {
  return (await db.query<any>(sql, args)).rows[0];
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  const dir = new URL("../../drizzle/migrations/", import.meta.url);
  const initial = (await readdir(dir)).find(
    (name) => name.startsWith("0000") && name.endsWith(".sql"),
  )!;
  await db.exec(await readFile(new URL(initial, dir), "utf8"));
  await db.exec(
    `insert into auth.users(id) values('${A}'),('${C}');alter table orders add column archived_at timestamptz;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261024114941_admin_management_dashboard.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261024121752_tracking_and_admin_audit.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  product = (
    await one("insert into products(name,slug,price) values('Local','local',59.9) returning id")
  ).id;
  await db.query(
    "insert into product_variants(product_id,color,sku,stock) values($1,'Preto','LOCAL',1)",
    [product],
  );
  order = (
    await one(
      `insert into orders(user_id,customer_name,customer_email,customer_phone,ship_cep,ship_street,ship_number,ship_district,ship_city,ship_state,subtotal,shipping,total) values($1,'Local','local@example.test','','00000000','Rua','1','Bairro','Cidade','BA',59.9,37.8,97.7) returning id`,
      [A],
    )
  ).id;
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role;set test.uid='${C}';`);
});
afterAll(() => db.close());
describe("Permissions using the actual baseline schema and new migrations", () => {
  it("isolates customer profiles and another customer orders through actual RLS policies", async () => {
    await db.exec("set role authenticated");
    expect((await db.query("select id from profiles")).rows).toEqual([{ id: C }]);
    expect((await db.query("select id from orders")).rows).toHaveLength(0);
  });
  it("prevents a customer from modifying products, variants and another order", async () => {
    await db.exec("set role authenticated");
    expect(
      (await db.query("update products set price=1 where id=$1 returning id", [product])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("update product_variants set stock=999 returning id")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("update orders set tracking_code='BAD' where id=$1 returning id", [order]))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.query("insert into products(name,slug,price) values('Bad','bad',1)"),
    ).rejects.toThrow(/row-level security/);
  });
  it("does not let a customer assign an administrative role or write email logs", async () => {
    await db.exec("set role authenticated");
    await expect(
      db.exec(`insert into user_roles(user_id,role) values('${C}','admin')`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(
        "insert into tracking_email_attempts(order_id,state,result_code) values($1,'accepted','fake')",
        [order],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("permits an authorized admin to read orders and edit tracking while preserving payment state", async () => {
    await db.exec(`set test.uid='${A}';set role authenticated;`);
    expect((await db.query("select id from orders")).rows).toHaveLength(1);
    expect(
      (
        await one(
          "select admin_save_tracking($1,'Teste','CODE','https://transportadora.example') ok",
          [order],
        )
      ).ok,
    ).toBe(true);
    expect(
      await one("select payment_status,status from orders where id=$1", [order]),
    ).toMatchObject({ payment_status: "pendente", status: "aguardando_pagamento" });
  });
  it("never bootstraps admin privileges from public signup after the audit migration", async () => {
    await db.exec("delete from user_roles where role='admin'");
    const N = "33333333-3333-4333-8333-333333333333";
    await db.exec(
      `insert into auth.users(id,raw_user_meta_data) values('${N}','{"role":"admin","full_name":"Local"}')`,
    );
    expect((await db.query("select role from user_roles where user_id=$1", [N])).rows).toEqual([
      { role: "user" },
    ]);
    expect((await one("select count(*) n from profiles")).n).toBe(3);
    await db.exec(`insert into user_roles(user_id,role) values('${A}','admin')`);
  });
});
