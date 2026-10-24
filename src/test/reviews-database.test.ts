// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111",
  customer = "22222222-2222-4222-8222-222222222222",
  product = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create type app_role as enum('admin','user');
 create function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable as $$select _user_id='${admin}'::uuid and _role='admin'$$;
 grant usage on schema auth to anon,authenticated;
 create table products(id uuid primary key);insert into products values('${product}');`);
  const sql = await readFile(
    new URL(
      "../../supabase/migrations/20261024181319_storefront_reviews_runtime.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
afterAll(() => db.close());
describe("Review storage and permissions", () => {
  it("allows pending submissions but prevents self-approval or forged store provenance", async () => {
    await db.exec(`select set_config('test.uid','${customer}',false);set role authenticated`);
    await db.query(
      "insert into product_reviews(product_id,author_name,rating,comment) values($1,$2,5,$3)",
      [product, "Cliente local", "Avaliação real de teste isolado."],
    );
    await expect(
      db.query(
        "insert into product_reviews(product_id,author_name,rating,comment,approved) values($1,$2,5,$3,true)",
        [product, "Cliente local", "Avaliação não autorizada."],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        "insert into product_reviews(product_id,author_name,rating,comment,source) values($1,$2,5,$3,'admin')",
        [product, "Cliente local", "Origem de loja não autorizada."],
      ),
    ).rejects.toThrow(/row-level security/);
    expect((await db.query("select * from product_reviews")).rows).toHaveLength(0);
    await db.exec("reset role");
  });
  it("publishes approved feedback only and preserves provenance", async () => {
    await db.exec(`select set_config('test.uid','${admin}',false);set role authenticated`);
    expect((await db.query("select * from product_reviews")).rows).toHaveLength(1);
    await db.exec("update product_reviews set approved=true");
    await db.query(
      "insert into product_reviews(product_id,author_name,rating,comment,approved,source) values($1,$2,4,$3,true,'admin')",
      [product, "Outro cliente local", "Feedback autorizado de teste isolado."],
    );
    await db.exec("reset role;set role anon");
    expect((await db.query("select source from product_reviews order by source")).rows).toEqual([
      { source: "admin" },
      { source: "customer" },
    ]);
    await expect(db.query("delete from product_reviews")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
});
