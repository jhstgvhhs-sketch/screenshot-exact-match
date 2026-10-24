// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const ADMIN = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";
const one = async (sql: string, args: unknown[] = []) => (await db.query<any>(sql, args)).rows[0];
async function report(from = "2026-10-01", to = "2026-10-31") {
  return (await one("select admin_financial_report($1,$2) r", [from, to])).r;
}
async function add(
  total = 100,
  paid = true,
  at = "2026-10-24T12:00:00Z",
  status = "processing",
  method = "pix",
) {
  // Disable only the observer in this isolated local fixture to seed known historical timestamps.
  await db.exec("alter table orders disable trigger admin_payment_timestamp");
  const o = await one(
    "insert into orders(user_id,customer_email,total,shipping,payment_status,status,payment_method,paid_at,created_at) values($1,'local@example.test',$2,10,$3,$4,$5,$6,$7) returning id",
    [
      CUSTOMER,
      total,
      paid ? "pago" : "pendente",
      status,
      method,
      paid ? at : null,
      "2026-10-24T12:00:00Z",
    ],
  );
  await db.exec("alter table orders enable trigger admin_payment_timestamp");
  return o.id;
}
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create type app_role as enum ('admin','user');create function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable as $$select _user_id='${ADMIN}'::uuid and _role='admin'$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create table profiles(id uuid primary key,full_name text,phone text,created_at timestamptz default now());
 create table products(id uuid primary key,name text,material text,images text[]);
 create table orders(id uuid primary key default gen_random_uuid(),user_id uuid,customer_email text,created_at timestamptz default now(),total numeric,shipping numeric,discount numeric default 0,payment_status text,status text,payment_method text,customer_name text default 'Cliente',tracking_code text,archived_at timestamptz);
 create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid,product_id uuid,product_name text,color text,quantity int,unit_price numeric);
 grant select on profiles,products,orders,order_items to authenticated;
 alter table profiles enable row level security;alter table orders enable row level security;alter table order_items enable row level security;
 create policy admin_profiles on profiles for select to authenticated using(has_role(auth.uid(),'admin'));
 create policy own_orders on orders for select to authenticated using(user_id=auth.uid() or has_role(auth.uid(),'admin'));
 create policy admin_items on order_items for select to authenticated using(has_role(auth.uid(),'admin'));
 insert into profiles values('${CUSTOMER}','Cliente local','',now());insert into products values('${PRODUCT}','PLA','PLA','{}');
 insert into orders(user_id,total,payment_status,status) values('${CUSTOMER}',50,'pago','processing');`);
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261024114941_admin_management_dashboard.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role;set test.uid='${ADMIN}';delete from order_items;delete from orders;`);
});
afterAll(() => db.close());
describe("Financial SQL on local Postgres", () => {
  it("counts paid orders once, excludes cancellations and uses the confirmation date", async () => {
    const oid = await add(100);
    await add(200, true, undefined, "processing", "card");
    await add(500, false);
    await add(900, true, undefined, "cancelado");
    await db.query(
      "insert into order_items(order_id,product_id,product_name,color,quantity,unit_price) values($1,$2,'PLA','Preto',2,25),($1,$2,'PLA','Branco',2,25)",
      [oid, PRODUCT],
    );
    const r = await report();
    expect(r.revenue).toBe(300);
    expect(r.ticket).toBe(150);
    expect(r.paid).toBe(2);
    expect(r.pending).toBe(1);
    expect(r.pendingValue).toBe(500);
    expect(r.total).toBe(4);
    expect(r.products[0]).toMatchObject({ quantity: 4, revenue: 90 });
    expect(r.colors).toHaveLength(2);
    expect(r.colors[0].material).toBe("PLA");
  });
  it("places UTC payments in the correct Sao Paulo day with exclusive end boundary", async () => {
    await add(100, true, "2026-10-24T02:59:59Z");
    await add(200, true, "2026-10-24T03:00:00Z");
    await add(300, true, "2026-10-25T03:00:00Z");
    const r = await report("2026-10-24", "2026-10-24");
    expect(r.revenue).toBe(200);
    expect(r.series).toEqual([{ date: "2026-10-24", revenue: 200 }]);
  });
  it("separates legacy paid orders without dates rather than guessing", async () => {
    await add(88, true, null as any);
    const r = await report();
    expect(r.revenue).toBe(0);
    expect(r.undatedPaid).toBe(1);
    expect(r.undatedValue).toBe(88);
  });
  it("records future confirmation once and does not let status edits change it", async () => {
    const id = await add(100, false);
    await db.query("update orders set payment_status='paid' where id=$1", [id]);
    const a = await one("select paid_at from orders where id=$1", [id]);
    expect(a.paid_at).not.toBeNull();
    await db.query("update orders set status='shipped',paid_at='2000-01-01' where id=$1", [id]);
    expect((await one("select paid_at from orders where id=$1", [id])).paid_at).toEqual(a.paid_at);
  });
  it("keeps archived paid orders in revenue", async () => {
    const id = await add();
    await db.query("update orders set archived_at=now() where id=$1", [id]);
    expect((await report()).revenue).toBe(100);
  });
  it("uses saved variant color and material even when the catalog changes", async () => {
    const id = await add();
    await db.query(
      "insert into order_items(order_id,product_id,product_name,color,quantity,unit_price) values($1,$2,'PLA antigo','Azul',2,50)",
      [id, PRODUCT],
    );
    await db.query("update products set material='PETG' where id=$1", [PRODUCT]);
    const r = await report();
    expect(r.colors[0]).toMatchObject({ color: "Azul", material: "PLA", quantity: 2 });
    await db.query("update products set material='PLA' where id=$1", [PRODUCT]);
  });
  it("does not label missing historical materials from current catalog", async () => {
    const id = await add();
    await db.query(
      "insert into order_items(order_id,product_id,product_name,color,quantity,unit_price) values($1,$2,'PLA','Preto',1,100)",
      [id, PRODUCT],
    );
    await db.query("update order_items set material_snapshot=null where order_id=$1", [id]);
    expect((await report()).colors[0].material).toBe("Material não registrado");
  });
  it("returns only the bounded customer page and confirmed spend", async () => {
    await add(100);
    await add(200, false);
    await add(500, true, undefined, "cancelled");
    const r = (await one("select admin_customer_page('Cliente',0) r")).r;
    expect(r.count).toBe(1);
    expect(r.rows[0]).toMatchObject({ orders: 3, paid_total: 100, email: "local@example.test" });
    expect(r.rows[0]).not.toHaveProperty("cpf");
  });
  it("denies a normal signed-in customer even if they own orders", async () => {
    await add();
    await db.exec(`set role authenticated;set test.uid='${CUSTOMER}'`);
    await expect(report()).rejects.toThrow(/administrativo/);
    await expect(db.query("select admin_customer_page('',0)")).rejects.toThrow(/administrativo/);
  });
  it("denies anonymous financial and customer RPC access", async () => {
    await db.exec("set role anon");
    await expect(report()).rejects.toThrow(/permission denied/);
    await expect(db.query("select admin_customer_page('',0)")).rejects.toThrow(/permission denied/);
  });
  it("works as an authorized admin under existing RLS without definer access", async () => {
    await add();
    await db.exec("set role authenticated");
    expect((await report()).revenue).toBe(100);
  });
  it("searches partial displayed order identifiers and respects paid filters", async () => {
    const id = await add();
    await add(200, false);
    const r = (await one("select admin_order_page($1,'paid',0,false,null) r", [id.slice(0, 8)])).r;
    expect(r.count).toBe(1);
    expect(r.rows[0].id).toBe(id);
    expect(r.rows[0]).not.toHaveProperty("customer_cpf");
  });
  it("rejects inverted or excessive ranges", async () => {
    await expect(report("2026-10-31", "2026-10-01")).rejects.toThrow(/dias/);
    await expect(report("2020-01-01", "2026-10-01")).rejects.toThrow(/dias/);
  });
});
