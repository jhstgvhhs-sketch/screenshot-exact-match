// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
import { trackingHandler } from "../../supabase/functions/_shared/tracking-handler";
import { sendTrackingEmail } from "../../supabase/functions/_shared/tracking-email";
import type { TrackingOrder } from "../../supabase/functions/_shared/tracking-rules";
const order: TrackingOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_name: "Cliente local",
  customer_phone: "71912345678",
  customer_email: "local@example.test",
  status: "shipped",
  tracking_carrier: "Teste",
  tracking_code: "ABC123",
  tracking_url: "https://transportadora.example/track",
};
const config = { enabled: true, apiKey: "local-test-placeholder", from: "loja@example.test" };
let attempts: any[],
  jobs: Map<string, any>,
  rpc: ReturnType<typeof vi.fn>,
  fetcher: ReturnType<typeof vi.fn>,
  db: any;
beforeEach(() => {
  attempts = [];
  jobs = new Map();
  rpc = vi.fn(async (_name, args) => {
    const key = args.p_fingerprint;
    let job = jobs.get(key);
    if (job) return { data: { claimed: false, notification: job }, error: null };
    job = { id: crypto.randomUUID(), state: "processing", result_code: "processing" };
    jobs.set(key, job);
    return { data: { claimed: true, notification: { ...job } }, error: null };
  });
  fetcher = vi.fn(async (url: string) =>
    url.includes("/domains")
      ? new Response(JSON.stringify({ data: [{ name: "example.test", status: "verified" }] }))
      : new Response(JSON.stringify({ id: "local-provider-id" }), { status: 200 }),
  );
  db = {
    rpc,
    from: vi.fn((table: string) => {
      const q: any = {};
      let id = "";
      let updates: any;
      for (const method of ["select", "order", "limit"]) q[method] = () => q;
      q.eq = (key: string, value: string) => {
        if (key === "id") id = value;
        return q;
      };
      q.insert = (payload: any) => {
        if (table === "tracking_email_attempts") attempts.push(payload);
        return q;
      };
      q.update = (payload: any) => {
        updates = payload;
        return q;
      };
      q.single = async () => {
        if (table === "orders") return { data: { ...order }, error: null };
        const job = [...jobs.values()].find((job) => job.id === id);
        if (job && updates) Object.assign(job, updates);
        return { data: job ? { id: job.id } : null, error: null };
      };
      q.then = (resolve: any) =>
        resolve({
          data: table === "tracking_email_notifications" ? [...jobs.values()] : attempts,
          error: null,
        });
      return q;
    }),
  };
});
function handler(custom: Partial<Parameters<typeof trackingHandler>[0]> = {}) {
  return trackingHandler({
    authorize: async () => "local-admin",
    db: () => db,
    config: () => config,
    fetcher: fetcher as typeof fetch,
    ...custom,
  });
}
const request = (mode = "send", extra = {}) =>
  new Request("https://local.test/tracking-email", {
    method: "POST",
    body: JSON.stringify({ orderId: order.id, mode, ...extra }),
  });
describe("Tracking email backend (all providers mocked)", () => {
  it("rejects unauthenticated or non-admin requests before reading orders", async () => {
    const response = await handler({
      authorize: async () => {
        throw new Error("unauthorized");
      },
    })(request());
    expect(response.status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects attempts to override the server-side recipient", async () => {
    expect((await handler()(request("send", { to: "other@example.test" }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns an honest configuration error and logs a blocked attempt without any provider calls", async () => {
    const response = await handler({ config: () => ({ ...config, enabled: false }) })(request());
    expect(response.status).toBe(412);
    expect((await response.json()).error).toContain("Nenhum e-mail foi enviado");
    expect(attempts[0]).toMatchObject({
      state: "blocked",
      result_code: "email_configuration_missing",
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("runs dry tests without messages, notification claims or attempt writes", async () => {
    const response = await handler()(request("test"));
    expect((await response.json()).dryRun).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
    expect(attempts).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("sends to the actual order email with a stable idempotency key and logs acceptance, not delivery", async () => {
    const response = await handler()(request());
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.state).toBe("accepted");
    expect(result.message).toContain("ainda não foi confirmada");
    const call = fetcher.mock.calls.find((call) => String(call[0]).endsWith("/emails"))!;
    const init = call[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual([order.customer_email]);
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toMatch(
      /^3dflex-tracking\//,
    );
    expect(attempts.map((a) => a.state)).toEqual(["processing", "accepted"]);
    expect(JSON.stringify(attempts)).not.toContain(order.customer_email);
    expect(JSON.stringify(attempts)).not.toContain(config.apiKey);
  });
  it("does not call a provider again on repeated or overlapping clicks", async () => {
    const send = handler();
    await Promise.all([send(request()), send(request())]);
    await send(request());
    expect(fetcher.mock.calls.filter((call) => String(call[0]).endsWith("/emails"))).toHaveLength(
      1,
    );
    expect(jobs.size).toBe(1);
  });
  it("keeps an uncertain network outcome locked against retries", async () => {
    fetcher.mockImplementation(async (url: string) => {
      if (url.includes("/domains"))
        return new Response(
          JSON.stringify({ data: [{ name: "example.test", status: "verified" }] }),
        );
      throw new Error("timeout");
    });
    const send = handler();
    expect((await (await send(request())).json()).state).toBe("uncertain");
    const second = await (await send(request())).json();
    expect(second.duplicate).toBe(true);
    expect(fetcher.mock.calls.filter((call) => String(call[0]).endsWith("/emails"))).toHaveLength(
      1,
    );
  });
  it("never sends from an unverified domain", async () => {
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ name: "example.test", status: "pending" }] })),
    );
    const result = await sendTrackingEmail(order, "local", config, fetcher as typeof fetch);
    expect(result).toMatchObject({ state: "failed", code: "sender_domain_not_verified" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("records a known provider rejection instead of reporting success", async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.includes("/domains")
        ? new Response(JSON.stringify({ data: [{ name: "example.test", status: "verified" }] }))
        : new Response("{}", { status: 422 }),
    );
    const response = await handler()(request());
    expect(response.status).toBe(502);
    expect((await response.json()).state).toBe("failed");
    expect(attempts.at(-1)).toMatchObject({ state: "failed", http_status: 422 });
  });
});
