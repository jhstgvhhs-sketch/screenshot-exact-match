export type Period = "today" | "yesterday" | "7" | "30" | "month" | "custom";
export function saoPauloDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
const shift = (day: string, n: number) => {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};
export function reportRange(period: Period, start: string, end: string, now = new Date()) {
  const today = saoPauloDay(now);
  const range =
    period === "today"
      ? [today, today]
      : period === "yesterday"
        ? [shift(today, -1), shift(today, -1)]
        : period === "7"
          ? [shift(today, -6), today]
          : period === "30"
            ? [shift(today, -29), today]
            : period === "month"
              ? [today.slice(0, 8) + "01", today]
              : [start, end];
  const [from, to] = range;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  const validDay = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
  if (!validDay(from) || !validDay(to) || !Number.isFinite(days) || days < 0 || days > 366)
    throw new Error("Selecione um período válido de até 367 dias.");
  return { from, to };
}
export type FinancialReport = {
  today: number;
  week: number;
  month: number;
  revenue: number;
  paid: number;
  ticket: number;
  pending: number;
  pendingValue: number;
  total: number;
  undatedPaid: number;
  undatedValue: number;
  series: { date: string; revenue: number }[];
  products: {
    product_id: string;
    product_name: string;
    image: string | null;
    quantity: number;
    revenue: number;
  }[];
  colors: { color: string; material: string; quantity: number; revenue: number }[];
  materials: { material: string; quantity: number; revenue: number }[];
  methods: { method: string; state: string; quantity: number; value: number }[];
  statuses: { label: string; quantity: number }[];
};
// Quotes + formula-prefix neutralization prevent spreadsheet formula execution.
export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return '"' + (/^[\s]*[=+\-@]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
}
export function financialCsv(report: FinancialReport, from: string, to: string) {
  const rows: unknown[][] = [
    ["Relatório 3DFLEX", from, to],
    ["Critério", "Pagamentos confirmados com data registrada; America/Sao_Paulo"],
    ["Faturamento confirmado", report.revenue],
    ["Pedidos pagos", report.paid],
    ["Ticket médio", report.ticket],
    ["Pagos sem data (fora do período)", report.undatedPaid],
    ["Tipo", "Descrição", "Material / situação", "Quantidade", "Valor (R$)"],
    ...report.products.map((p) => ["Produto", p.product_name, "", p.quantity, p.revenue]),
    ...report.colors.map((c) => ["Cor", c.color, c.material, c.quantity, c.revenue]),
    ...report.materials.map((m) => ["Material", m.material, "", m.quantity, m.revenue]),
    ...report.methods.map((m) => ["Pagamento", m.method, m.state, m.quantity, m.value]),
  ];
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((v) =>
            csvCell(
              typeof v === "number"
                ? v.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 2 })
                : v,
            ),
          )
          .join(";"),
      )
      .join("\r\n")
  );
}
