// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { recentPaidPurchases } from "../../supabase/functions/_shared/purchase-feed";
const now = Date.parse("2026-10-24T12:00:00Z");
function database(rows: any[], error: any = null) {
  const methods = Object.fromEntries(
    ["select", "in", "not", "gte", "lte", "order", "limit"].map((name) => [name, vi.fn()]),
  );
  const query: any = { ...methods, then: (resolve: any) => resolve({ data: rows, error }) };
  Object.values(methods).forEach((method) => method.mockReturnValue(query));
  return { db: { from: vi.fn(() => query) } as any, methods };
}
describe("Real paid purchase feed", () => {
  it("queries only trusted confirmation timestamps and excludes pending/cancelled payments", async () => {
    const { db, methods } = database([
      { paid_at: "2026-10-24T11:00:00Z", customer_name: "Must not be exposed", id: "private" },
    ]);
    expect(await recentPaidPurchases(db, now)).toEqual([{ createdAt: "2026-10-24T11:00:00Z" }]);
    expect(methods.select).toHaveBeenCalledWith("paid_at");
    expect(methods.in).toHaveBeenCalledWith("payment_status", ["pago", "paid"]);
    expect(methods.not).toHaveBeenCalledWith("status", "in", "(cancelado,cancelled)");
    expect(methods.limit).toHaveBeenCalledWith(3);
  });
  it("does not invent confirmation dates for legacy paid orders", async () => {
    const { db } = database([
      { paid_at: null, created_at: "2026-10-24T11:00:00Z" },
      { paid_at: "invalid" },
      { paid_at: "2026-10-25T12:00:00Z" },
      { paid_at: "2026-10-22T12:00:00Z" },
    ]);
    expect(await recentPaidPurchases(db, now)).toEqual([]);
  });
  it("surfaces an unavailable feed rather than generating fake purchases", async () => {
    const { db } = database([], new Error("Unavailable"));
    await expect(recentPaidPurchases(db, now)).rejects.toThrow("Unavailable");
  });
});
