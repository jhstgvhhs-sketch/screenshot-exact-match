// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const db = new PGlite();
const order = "11111111-1111-4111-8111-111111111111",
  variant = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create table orders(id uuid primary key,total numeric,payment_status text,status text);
    create table pix_transactions(order_id uuid,transaction_id text,amount_cents int,status text);
    create table product_variants(id uuid primary key,stock int);
    create table order_items(order_id uuid,variant_id uuid,quantity int);`);
  const report = await readFile(
    new URL(
      "../../supabase/migrations/20261024114941_admin_management_dashboard.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(
    report.slice(0, report.indexOf("create or replace function public.admin_capture_material")),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261022000008_atomic_pix_settlement.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role;truncate orders,pix_transactions,product_variants,order_items;
  insert into orders(id,total,payment_status,status) values('${order}',97.70,'pendente','aguardando_pagamento');
  insert into pix_transactions values('${order}','tx-local',9770,'pending');
  insert into product_variants values('${variant}',0);insert into order_items values('${order}','${variant}',1);`);
});
afterAll(() => db.close());
const settle = async (status: string, amount = 9770) =>
  (
    await db.query<{ result: string }>("select settle_pix_order($1,'tx-local',$2,$3) result", [
      order,
      amount,
      status,
    ])
  ).rows[0].result;
describe("Existing atomic Pix settlement", () => {
  it("timestamps confirmed payments once and ignores duplicate callbacks", async () => {
    expect(await settle("paid")).toBe("paid");
    const first = (await db.query<{ paid_at: Date | null }>("select paid_at from orders")).rows[0]
      .paid_at;
    expect(first).not.toBeNull();
    expect(await settle("paid")).toBe("already_paid");
    expect(
      (await db.query<{ paid_at: Date | null }>("select paid_at from orders")).rows[0].paid_at,
    ).toEqual(first);
    expect(
      (await db.query<{ stock: number }>("select stock from product_variants")).rows[0].stock,
    ).toBe(0);
  });
  it.each(["cancelled", "expired"])(
    "releases inventory once for %s without recording revenue",
    async (status) => {
      expect(await settle(status)).toBe(status);
      expect(await settle(status)).toBe("already_closed");
      expect(
        (await db.query<{ stock: number }>("select stock from product_variants")).rows[0].stock,
      ).toBe(1);
      expect(
        (await db.query<{ paid_at: Date | null }>("select paid_at from orders")).rows[0].paid_at,
      ).toBeNull();
    },
  );
  it("rejects mismatched amounts and unprivileged execution", async () => {
    expect(await settle("paid", 1)).toBe("mismatch");
    expect(
      (await db.query<{ payment_status: string }>("select payment_status from orders")).rows[0]
        .payment_status,
    ).toBe("pendente");
    await db.exec("set role authenticated");
    await expect(settle("paid")).rejects.toThrow(/permission denied/);
  });
});
