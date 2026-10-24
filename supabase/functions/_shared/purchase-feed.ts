import type { adminClient } from "./recovery-server.ts";

// The public feed contains confirmation timestamps only; never customer or order details.
export async function recentPaidPurchases(db: ReturnType<typeof adminClient>, now = Date.now()) {
  const { data, error } = await db
    .from("orders")
    .select("paid_at")
    .in("payment_status", ["pago", "paid"])
    .not("status", "in", "(cancelado,cancelled)")
    .gte("paid_at", new Date(now - 86400000).toISOString())
    .lte("paid_at", new Date(now).toISOString())
    .order("paid_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data ?? [])
    .flatMap((row) => {
      if (typeof row.paid_at !== "string") return [];
      const time = Date.parse(row.paid_at);
      return Number.isFinite(time) && time <= now && time > now - 86400000
        ? [{ createdAt: row.paid_at }]
        : [];
    })
    .slice(0, 3);
}
