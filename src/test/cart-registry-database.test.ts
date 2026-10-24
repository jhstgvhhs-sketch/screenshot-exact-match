// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111",
  customer = "22222222-2222-4222-8222-222222222222",
  variant = "33333333-3333-4333-8333-333333333333";
type Dashboard = {
  carts: {
    id: string;
    status: string;
    estimated_value: number;
    items: unknown[];
    email: string;
    phone: string;
    customer_name: string;
  }[];
  count: number;
  metrics: { abandoned: number; potential: number; recovered: number; revenue: number };
};
const sync = async (token = "a".repeat(64), contact: unknown = null, consents: unknown = null) =>
  (
    await db.query<{ data: { cartId: string } }>(
      "select registry_sync_cart($1,$2::jsonb,$3::jsonb,$4::jsonb) data",
      [
        token,
        JSON.stringify([{ variant_id: variant, quantity: 2, price: 0.01, name: "forged" }]),
        contact === null ? null : JSON.stringify(contact),
        consents === null ? null : JSON.stringify(consents),
      ],
    )
  ).rows[0].data.cartId;
const dashboard = async () =>
  (await db.query<{ data: Dashboard }>("select admin_cart_registry() data")).rows[0].data;
async function role(name: string, user = "") {
  await db.exec(`reset role;select set_config('test.uid','${user}',false);set role ${name}`);
}
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 create type app_role as enum('admin','user');
 create function public.has_role(_role app_role,_user_id uuid) returns boolean language sql stable as $$select _role='admin' and _user_id='${admin}'::uuid$$;
 create table profiles(id uuid primary key);insert into profiles values('${admin}'),('${customer}');
 create table products(id uuid primary key,name text,price numeric,active boolean);
 create table product_variants(id uuid primary key,product_id uuid,color text,stock integer);
 insert into products values('${variant}','PLA MasterPrint',59.90,true);insert into product_variants values('${variant}','${variant}','Preto',1);
 create table orders(id uuid primary key default gen_random_uuid(),user_id uuid,created_at timestamptz default now(),total numeric default 0,payment_method text,payment_status text,status text);
 create table order_items(order_id uuid,variant_id uuid,quantity integer);
 `);
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261024015332_abandoned_carts_recovery.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const sql = await readFile(
    new URL("../../supabase/migrations/20261024174213_cart_registry_rpc.sql", import.meta.url),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
beforeEach(async () => {
  await role("postgres");
  await db.exec(
    "truncate recovery_carts cascade;truncate orders cascade;truncate recovery_rate_limits;",
  );
});
afterAll(() => db.close());
describe("Cart registry RPC security and persistence", () => {
  it("captures anonymous carts at server prices without exposing data or modifying inventory", async () => {
    await role("anon");
    const id = await sync();
    expect(id).toBeTruthy();
    await expect(db.query("select * from recovery_carts")).rejects.toThrow(/permission denied/);
    await expect(dashboard()).rejects.toThrow(/permission denied/);
    await role("postgres");
    const row = (
      await db.query<{
        estimated_value: string;
        items: { name: string; price: number }[];
        session_hash: string;
      }>("select estimated_value,items,session_hash from recovery_carts")
    ).rows[0];
    expect(Number(row.estimated_value)).toBe(119.8);
    expect(row.items[0]).toMatchObject({ name: "PLA MasterPrint", price: 59.9 });
    expect(row.session_hash).not.toBe("a".repeat(64));
    expect(
      (await db.query<{ stock: number }>("select stock from product_variants")).rows[0].stock,
    ).toBe(1);
  });
  it("updates the same session and captures only authorized contact fields", async () => {
    await role("anon");
    const id = await sync();
    expect(
      await sync(
        "a".repeat(64),
        {
          name: "Teste local",
          email: "LOCAL@example.test",
          phone: "71999999999",
          cpf: "never save",
          card_number: "never save",
        },
        { email: true },
      ),
    ).toBe(id);
    await role("authenticated", admin);
    const data = await dashboard();
    expect(data.count).toBe(1);
    expect(data.carts[0]).toMatchObject({
      email: "local@example.test",
      phone: "5571999999999",
      customer_name: "Teste local",
    });
    expect(JSON.stringify(data)).not.toContain("never save");
    expect(JSON.stringify(data)).not.toContain("session_hash");
    await role("postgres");
    expect((await db.query("select * from recovery_consents")).rows).toHaveLength(1);
    expect((await db.query("select * from recovery_jobs")).rows).toHaveLength(0);
  });
  it("blocks customer access to administrative data and token writes owned by another account", async () => {
    await role("authenticated", customer);
    await sync();
    expect((await db.query("select * from recovery_carts")).rows).toHaveLength(0);
    await expect(dashboard()).rejects.toThrow(/administrativo/);
    await role("anon");
    await expect(sync()).rejects.toThrow(/Cart session unavailable/);
  });
  it("uses server time for abandonment and paginated filters", async () => {
    const id = await sync();
    await db.query(
      "update recovery_carts set last_activity_at=now()-interval '29 minutes' where id=$1",
      [id],
    );
    await role("authenticated", admin);
    expect((await dashboard()).carts[0].status).toBe("active");
    await role("postgres");
    await db.query(
      "update recovery_carts set last_activity_at=now()-interval '31 minutes' where id=$1",
      [id],
    );
    await role("authenticated", admin);
    const data = await dashboard();
    expect(data.carts[0].status).toBe("abandoned");
    expect(data.metrics.abandoned).toBe(1);
    expect(Number(data.metrics.potential)).toBe(119.8);
    const page = (
      await db.query<{ data: Dashboard }>("select admin_cart_registry(0,'active') data")
    ).rows[0].data;
    expect(page.count).toBe(0);
  });
  it("excludes pending payments from abandonment and counts confirmed orders once", async () => {
    await role("authenticated", customer);
    const id = await sync();
    await role("postgres");
    await db.query(
      "update recovery_carts set last_activity_at=now()-interval '40 minutes' where id=$1",
      [id],
    );
    const order = (
      await db.query<{ id: string }>(
        `insert into orders(user_id,total,payment_method,payment_status,status) values('${customer}',157.60,'pix','pendente','aguardando_pagamento') returning id`,
      )
    ).rows[0].id;
    await db.query("insert into order_items values($1,$2,2)", [order, variant]);
    await role("authenticated", admin);
    expect((await dashboard()).carts[0].status).toBe("pending_payment");
    expect((await dashboard()).metrics.recovered).toBe(0);
    await role("postgres");
    await db.query("update orders set payment_status='pago' where id=$1", [order]);
    await role("authenticated", admin);
    const data = await dashboard();
    expect(data.carts[0].status).toBe("recovered");
    expect(data.metrics.recovered).toBe(1);
    expect(Number(data.metrics.revenue)).toBe(157.6);
  });
  it("validates tokens and quantities without creating unusable carts", async () => {
    await expect(sync("invalid")).rejects.toThrow(/Sessão/);
    await expect(
      db.query("select registry_sync_cart($1,$2::jsonb)", [
        "a".repeat(64),
        JSON.stringify([{ variant_id: variant, quantity: 11 }]),
      ]),
    ).rejects.toThrow(/Itens/);
    expect((await db.query("select * from recovery_carts")).rows).toHaveLength(0);
  });
});
