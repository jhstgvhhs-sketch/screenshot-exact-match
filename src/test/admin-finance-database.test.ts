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
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create type app_role as enum ('admin','user');create function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable as $$select _user_id='${ADMIN}'::uuid and _role='admin'$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create table user_roles(user_id uuid,role app_role);
 create table profiles(id uuid primary key,full_name text,phone text,created_at timestamptz default now());
 create table products(id uuid primary key,name text,material text,images text[]);
 create table orders(id uuid primary key default gen_random_uuid(),user_id uuid,customer_email text,created_at timestamptz default now(),total numeric,shipping numeric,discount numeric default 0,payment_status text,status text,payment_method text,customer_name text default 'Cliente',customer_phone text default '',tracking_code text,archived_at timestamptz);
 create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid,product_id uuid,product_name text,color text,quantity int,unit_price numeric);
 grant select on profiles,products,orders,order_items to authenticated;grant update on orders to authenticated;
 alter table profiles enable row level security;alter table orders enable row level security;alter table order_items enable row level security;
 create policy admin_profiles on profiles for select to authenticated using(has_role(auth.uid(),'admin'));
 create policy own_orders on orders for select to authenticated using(user_id=auth.uid() or has_role(auth.uid(),'admin'));
 create policy admin_update on orders for update to authenticated using(has_role(auth.uid(),'admin')) with check(has_role(auth.uid(),'admin'));
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
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261024121752_tracking_and_admin_audit.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec(
    `reset role;set test.uid='${ADMIN}';delete from tracking_email_attempts;delete from tracking_email_notifications;delete from order_items;delete from orders;`,
  );
});
afterAll(() => db.close());
describe("Financial SQL on local Postgres", () => {
  it("reconciles allocated cents across every ranking and rounds the ticket to cents", async () => {
    const id = await add(100.01);
    await db.query("update orders set shipping=0 where id=$1", [id]);
    for (const color of ["Preto", "Branco", "Azul"])
      await db.query(
        "insert into order_items(order_id,product_id,product_name,color,quantity,unit_price) values($1,gen_random_uuid(),$2,$3,1,1)",
        [id, "Produto " + color, color],
      );
    const r = await report();
    for (const rows of [r.products, r.colors, r.materials])
      expect(Math.round(rows.reduce((sum: number, row: any) => sum + row.revenue, 0) * 100)).toBe(
        10001,
      );
    await add(1);
    await add(2);
    expect((await report()).ticket).toBe(34.34);
  });
  it("returns zero metrics and daily zero points when there are no sales", async () => {
    const r = await report("2026-10-24", "2026-10-24");
    expect(r).toMatchObject({
      revenue: 0,
      paid: 0,
      ticket: 0,
      pending: 0,
      pendingValue: 0,
      total: 0,
      today: 0,
      week: 0,
      month: 0,
      undatedPaid: 0,
    });
    expect(r.products).toEqual([]);
    expect(r.colors).toEqual([]);
    expect(r.series).toEqual([{ date: "2026-10-24", revenue: 0 }]);
  });
  it("flags paid orders lacking line items rather than inventing rankings", async () => {
    await add();
    const r = await report();
    expect(r.unitemizedPaid).toBe(1);
    expect(r.products).toEqual([]);
  });
  it("saves tracking independently of financial and delivery status", async () => {
    const id = await add(100, false);
    await db.exec("set role authenticated");
    const saved = await one(
      "select admin_save_tracking($1,'Transportadora','ABC','https://transportadora.example/track') saved",
      [id],
    );
    expect(saved.saved).toBe(true);
    const row = await one(
      "select payment_status,status,tracking_carrier,tracking_code,tracking_url from orders where id=$1",
      [id],
    );
    expect(row).toMatchObject({
      payment_status: "pendente",
      status: "processing",
      tracking_carrier: "Transportadora",
      tracking_code: "ABC",
      tracking_url: "https://transportadora.example/track",
    });
  });
  it("rejects insecure tracking URLs in both the RPC and direct database updates", async () => {
    const id = await add();
    await expect(
      db.query("select admin_save_tracking($1,'Teste','ABC','http://bad.example')", [id]),
    ).rejects.toThrow(/HTTPS/);
    await expect(
      db.query("update orders set tracking_url='javascript:alert(1)' where id=$1", [id]),
    ).rejects.toThrow(/check constraint/);
  });
  it("prevents customers from modifying tracking or reading administrative preferences and logs", async () => {
    const id = await add();
    await db.exec(`set role authenticated;set test.uid='${CUSTOMER}'`);
    await expect(
      db.query("select admin_save_tracking($1,'Teste','ABC','https://transportadora.example')", [
        id,
      ]),
    ).rejects.toThrow(/administrativo/);
    await db.query("update orders set tracking_code='HACK' where id=$1", [id]);
    expect(
      (await one("select tracking_code from orders where id=$1", [id])).tracking_code,
    ).not.toBe("HACK");
    expect((await db.query("select * from admin_preferences")).rows).toHaveLength(0);
    expect((await db.query("select * from tracking_email_notifications")).rows).toHaveLength(0);
    await expect(
      db.query("select tracking_email_claim($1,$2)", [id, "a".repeat(64)]),
    ).rejects.toThrow(/permission denied/);
  });
  it("persists a shared low-stock limit only for admins without updating inventory", async () => {
    await db.exec("set role authenticated");
    await db.exec("update admin_preferences set low_stock_limit=5 where id='main'");
    expect(
      (await one("select low_stock_limit from admin_preferences where id='main'")).low_stock_limit,
    ).toBe(5);
    await db.exec(`set test.uid='${CUSTOMER}'`);
    await db.exec("update admin_preferences set low_stock_limit=9 where id='main'");
    await db.exec(`set test.uid='${ADMIN}'`);
    expect(
      (await one("select low_stock_limit from admin_preferences where id='main'")).low_stock_limit,
    ).toBe(5);
  });
  it("claims a notification once and never reclaims acceptance or uncertainty, even after provider idempotency expires", async () => {
    const id = await add();
    const fingerprint = "a".repeat(64);
    await db.exec("grant select on orders to service_role;set role service_role");
    const first = (await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r;
    expect(first.claimed).toBe(true);
    expect((await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r.claimed).toBe(
      false,
    );
    await db.exec(
      "update tracking_email_notifications set state='accepted',updated_at=now()-interval '3 days'",
    );
    expect((await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r.claimed).toBe(
      false,
    );
    await db.exec("update tracking_email_notifications set state='uncertain'");
    expect((await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r.claimed).toBe(
      false,
    );
  });
  it("allows only a bounded explicit retry of a recorded rejection after cooldown", async () => {
    const id = await add();
    const fingerprint = "b".repeat(64);
    await db.exec("set role service_role");
    await one("select tracking_email_claim($1,$2) r", [id, fingerprint]);
    await db.exec("update tracking_email_notifications set state='failed'");
    expect((await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r.claimed).toBe(
      false,
    );
    await db.exec("update tracking_email_notifications set updated_at=now()-interval '2 minutes'");
    expect(
      (await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r.notification
        .attempts,
    ).toBe(2);
    await db.exec(
      "update tracking_email_notifications set state='failed',attempts=3,updated_at=now()-interval '2 minutes'",
    );
    expect((await one("select tracking_email_claim($1,$2) r", [id, fingerprint])).r.claimed).toBe(
      false,
    );
  });

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
