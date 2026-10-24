// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111",
  customer = "22222222-2222-4222-8222-222222222222";
let sql: string;
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create type app_role as enum('admin','user');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable as $$select _user_id='${admin}'::uuid and _role='admin'$$;grant usage on schema auth to authenticated,anon;`,
  );
  sql = await readFile(
    new URL("../../scripts/install-admin-runtime-settings.sql", import.meta.url),
    "utf8",
  );
  await db.exec(sql);
}, 30000);
afterAll(() => db.close());
describe("Missing runtime settings installation", () => {
  it("creates the payment preferences matching the existing Blackcat integration", async () => {
    const r = (
      await db.query<any>(
        "select provider,environment,pix_enabled from payment_gateway_settings where id='main'",
      )
    ).rows[0];
    expect(r).toEqual({ provider: "blackcat", environment: "production", pix_enabled: true });
  });
  it("allows public display preferences but protects payment preferences", async () => {
    await db.exec("set role anon");
    expect(
      (
        await db.query(
          "select title,display_seconds,interval_seconds from purchase_notification_settings",
        )
      ).rows,
    ).toHaveLength(1);
    await expect(db.query("select * from payment_gateway_settings")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role");
  });
  it("prevents a customer from reading gateway configuration or modifying notices", async () => {
    await db.exec(`set test.uid='${customer}';set role authenticated`);
    expect((await db.query("select * from payment_gateway_settings")).rows).toHaveLength(0);
    expect(
      (await db.query("update purchase_notification_settings set title='BAD' returning id")).rows,
    ).toHaveLength(0);
    await db.exec("reset role");
  });
  it("allows only admins to save notification preferences", async () => {
    await db.exec(`set test.uid='${admin}';set role authenticated`);
    expect(
      (
        await db.query(
          "update purchase_notification_settings set display_seconds=7 returning display_seconds",
        )
      ).rows,
    ).toEqual([{ display_seconds: 7 }]);
    await db.exec("reset role");
  });
  it("is repeatable and preserves an existing gateway choice and edited messages", async () => {
    await db.exec(
      "update payment_gateway_settings set provider='custom',pix_enabled=false;update purchase_notification_settings set title='Minha mensagem'",
    );
    await db.exec(sql);
    expect(
      (await db.query<any>("select provider,pix_enabled from payment_gateway_settings")).rows[0],
    ).toEqual({ provider: "custom", pix_enabled: false });
    expect(
      (await db.query<any>("select title,display_seconds from purchase_notification_settings"))
        .rows[0],
    ).toMatchObject({ title: "Minha mensagem", display_seconds: 7 });
  });
});
