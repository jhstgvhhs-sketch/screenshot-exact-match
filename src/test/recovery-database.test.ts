// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll,beforeAll,beforeEach,describe,expect,it } from "vitest";

const db=new PGlite();
const USER="11111111-1111-4111-8111-111111111111",VARIANT="22222222-2222-4222-8222-222222222222";
const ITEMS=[{variant_id:VARIANT,quantity:1,price:59.9,name:"PLA",color:"Branco"}];
const CONTACT={name:"Cliente local de teste",email:"local@example.test",phone:"5571999999999"};
let initial:unknown;
async function scalar<T=any>(sql:string,params:any[]=[]){return (await db.query<T>(sql,params)).rows[0] as any;}
async function cart(key="a",grants=true){
 const consents=grants?{email:{granted:true,contact_hash:"e".repeat(64)},whatsapp:{granted:true,contact_hash:"f".repeat(64)}}:{};
 return (await scalar("select recovery_sync($1,$2,$3::jsonb,$4::jsonb,$5::jsonb) id",[key.repeat(64),USER,JSON.stringify(ITEMS),JSON.stringify(CONTACT),JSON.stringify(consents)])).id as string;
}
async function abandon(id:string){await db.query("update recovery_carts set last_activity_at=now()-interval '65 minutes' where id=$1",[id]);await db.exec("select recovery_tick()");}
async function order(id:string,status="pendente",quantity=1){
 const row=await scalar("insert into orders(user_id,total,payment_status,payment_method,status) values($1,97.70,$2,'pix','aguardando_pagamento') returning id",[USER,status]);
 await db.query("insert into order_items(order_id,variant_id,quantity) values($1,$2,$3)",[row.id,VARIANT,quantity]);
 await db.query("update orders set total=97.70 where id=$1",[row.id]);return row.id;
}

beforeAll(async()=>{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${USER}');
 create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
 create type public.app_role as enum ('admin','user');
 create function public.has_role(_role public.app_role,_user_id uuid) returns boolean language sql stable as $$select false$$;
 create table public.orders(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),created_at timestamptz default now(),total numeric default 0,payment_status text default 'pendente',payment_method text,status text);
 create table public.order_items(order_id uuid references orders(id),variant_id uuid,quantity integer);
 `);
 await db.exec(await readFile(new URL("../../supabase/migrations/20261024015332_abandoned_carts_recovery.sql",import.meta.url),"utf8"));
 initial=(await scalar("select config from recovery_settings")).config;
},30000);
beforeEach(async()=>{
 await db.exec("reset role; truncate recovery_carts cascade; truncate orders cascade; truncate recovery_suppressions;");
 await db.query("update recovery_settings set config=$1::jsonb||'{\"enabled\":true,\"dry_run\":true,\"email_enabled\":true,\"whatsapp_enabled\":true}'::jsonb",[JSON.stringify(initial)]);
});
afterAll(()=>db.close());

describe("Recovery database invariants",()=>{
 it("marks abandonment only after 30 minutes and schedules relative to abandonment",async()=>{
  const id=await cart();await db.query("update recovery_carts set last_activity_at=now()-interval '29 minutes' where id=$1",[id]);await db.exec("select recovery_tick()");
  expect((await scalar("select status from recovery_carts where id=$1",[id])).status).toBe("active");
  await abandon(id);const row=await scalar("select status,extract(epoch from abandoned_at-last_activity_at)/60 gap from recovery_carts where id=$1",[id]);
  expect(row.status).toBe("abandoned");expect(Number(row.gap)).toBe(30);
  const jobs=await db.query<any>("select step,extract(epoch from due_at-abandoned_at)/60 gap from recovery_jobs join recovery_carts on recovery_carts.id=cart_id order by step");
  expect(jobs.rows.map(j=>Number(j.gap))).toEqual([30,30,1440,1440,4320,4320]);
 });
 it("never queues contact without channel-specific consent",async()=>{const id=await cart("a",false);await abandon(id);expect((await scalar("select count(*) n from recovery_jobs")).n).toBe(0);});
 it("claims each step once even across workers and repeated ticks",async()=>{
  const id=await cart();await abandon(id);await db.exec("select recovery_tick()");
  const a=await db.query<any>("select * from recovery_claim(gen_random_uuid())");const b=await db.query<any>("select * from recovery_claim(gen_random_uuid())");
  expect(a.rows).toHaveLength(2);expect(b.rows).toHaveLength(0);expect((await scalar("select count(*) n from recovery_jobs")).n).toBe(6);
 });
 it("pauses active Pix and does not count checkout visits as paid",async()=>{
  const id=await cart();await abandon(id);await order(id);
  expect((await scalar("select status from recovery_carts where id=$1",[id])).status).toBe("abandoned");
  expect((await db.query("select * from recovery_claim(gen_random_uuid())")).rows).toHaveLength(0);
  expect((await scalar("select recovery_metrics() m")).m.revenue).toBe(0);
 });
 it("payment confirmation immediately stops jobs and counts actual paid revenue",async()=>{
  const id=await cart();await abandon(id);await db.exec("select recovery_claim(gen_random_uuid())");const oid=await order(id);
  await db.query("update orders set payment_status='pago',status='pagamento_confirmado' where id=$1",[oid]);
  expect((await scalar("select status from recovery_carts where id=$1",[id])).status).toBe("recovered");
  expect((await scalar("select count(*) n from recovery_jobs where state in ('queued','claimed')")).n).toBe(0);
  expect((await scalar("select recovery_metrics() m")).m).toMatchObject({recovered:1,revenue:97.7});
 });
 it("does not associate a different quantity with a completed order",async()=>{
  const id=await cart();await abandon(id);await order(id,"pago",2);
  expect((await scalar("select status from recovery_carts where id=$1",[id])).status).toBe("abandoned");
 });
 it("opt-out cancels claimed jobs and passive sync cannot re-grant consent",async()=>{
  const id=await cart();await abandon(id);await db.exec("select recovery_claim(gen_random_uuid())");
  await db.query("select recovery_stop($1,'email',$2)",[id,"e".repeat(64)]);
  expect((await scalar("select email_consent from recovery_carts where id=$1",[id])).email_consent).toBe(false);
  expect((await scalar("select state from recovery_jobs where cart_id=$1 and channel='email' and step=0",[id])).state).toBe("cancelled");
  await db.query("select recovery_sync($1,$2,$3::jsonb,$4::jsonb,'{}'::jsonb)",["a".repeat(64),USER,JSON.stringify(ITEMS),JSON.stringify(CONTACT)]);
  expect((await scalar("select email_consent from recovery_carts where id=$1",[id])).email_consent).toBe(false);
 });
 it("changing a contact revokes the earlier grant",async()=>{
  const id=await cart();await db.query("select recovery_sync($1,$2,$3::jsonb,$4::jsonb,'{}'::jsonb)",["a".repeat(64),USER,JSON.stringify(ITEMS),JSON.stringify({...CONTACT,email:"changed@example.test"})]);
  expect((await scalar("select email_consent,whatsapp_consent from recovery_carts where id=$1",[id]))).toMatchObject({email_consent:false,whatsapp_consent:true});
 });
 it("stale claims become uncertain and are never automatically resent",async()=>{
  const id=await cart();await abandon(id);await db.exec("select recovery_claim(gen_random_uuid());update recovery_jobs set claimed_at=now()-interval '6 minutes' where state='claimed';select recovery_tick()");
  expect((await scalar("select count(*) n from recovery_jobs where state='uncertain'")).n).toBe(2);
  expect((await db.query("select * from recovery_claim(gen_random_uuid())")).rows).toHaveLength(0);
 });
 it("does not double-count recovery via a child cart",async()=>{
  const parent=await cart();await abandon(parent);
  await db.query("select recovery_sync($1,$2,$3::jsonb,$4::jsonb,'{}'::jsonb,$5)",["b".repeat(64),USER,JSON.stringify(ITEMS),JSON.stringify(CONTACT),parent]);
  await order(parent,"pago");const metrics=(await scalar("select recovery_metrics() m")).m;
  expect(metrics.recovered).toBe(1);expect(metrics.revenue).toBe(97.7);
 });
 it("retention deletes recovery PII and logs while preserving financial orders",async()=>{
  const id=await cart();const oid=await order(id);await db.query("update recovery_carts set last_activity_at=now()-interval '31 days' where id=$1",[id]);await db.exec("select recovery_tick()");
  expect((await scalar("select count(*) n from recovery_carts")).n).toBe(0);
  expect((await scalar("select count(*) n from recovery_consents")).n).toBe(0);
  expect((await scalar("select id from orders where id=$1",[oid])).id).toBe(oid);
 });
 it("RLS and function grants prevent anonymous or customer access to other carts",async()=>{
  await cart();await db.exec("set role anon");await expect(db.query("select * from recovery_carts")).rejects.toThrow();
  await expect(db.query("select recovery_metrics()")).rejects.toThrow();await db.exec("reset role;grant usage on schema auth to authenticated;set role authenticated");
  expect((await db.query("select * from recovery_carts")).rows).toHaveLength(0);
  await expect(db.query("select recovery_tick()")).rejects.toThrow();await db.exec("reset role");
 });
});
