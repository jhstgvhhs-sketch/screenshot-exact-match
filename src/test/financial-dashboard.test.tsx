import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ rpc: vi.fn(), charts: [] as { type: string; data: any[] }[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: m.rpc } }));
vi.mock("recharts", () => {
  const none = () => null;
  return {
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ data, children }: any) => {
      m.charts.push({ type: "revenue", data });
      return <div>{children}</div>;
    },
    BarChart: ({ data, children }: any) => {
      m.charts.push({ type: "bar", data });
      return <div>{children}</div>;
    },
    Area: none,
    Bar: none,
    XAxis: none,
    YAxis: none,
    Tooltip: none,
    Legend: none,
    CartesianGrid: none,
  };
});
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
const report = {
  today: 97.7,
  week: 97.7,
  month: 97.7,
  revenue: 97.7,
  paid: 1,
  ticket: 97.7,
  pending: 1,
  pendingValue: 80,
  total: 2,
  undatedPaid: 0,
  undatedValue: 0,
  unitemizedPaid: 0,
  series: [{ date: "2026-10-24", revenue: 97.7 }],
  products: [
    { product_id: "local", product_name: "PLA teste", image: null, quantity: 1, revenue: 59.9 },
  ],
  colors: [{ color: "Preto", material: "PLA", quantity: 1, revenue: 59.9 }],
  materials: [{ material: "PLA", quantity: 1, revenue: 59.9 }],
  methods: [
    { method: "Pix", state: "Pago", quantity: 1, value: 97.7 },
    { method: "Pix", state: "Pendente", quantity: 1, value: 80 },
  ],
  statuses: [
    { label: "Em preparação", quantity: 1 },
    { label: "Aguardando pagamento", quantity: 1 },
  ],
};
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  m.charts = [];
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  m.rpc.mockResolvedValue({ data: report, error: null });
});
afterEach(() => {
  cleanup();
  client.clear();
});
const show = () =>
  render(
    <QueryClientProvider client={client}>
      <FinancialDashboard reports />
    </QueryClientProvider>,
  );
describe("Dashboard uses the audited RPC", () => {
  it("uses the same RPC aggregates for cards, charts and rankings", async () => {
    show();
    expect(await screen.findByText("PLA teste")).toBeInTheDocument();
    expect(screen.getByText("Preto")).toBeInTheDocument();
    expect(
      m.charts.some(
        (c) => c.type === "revenue" && JSON.stringify(c.data) === JSON.stringify(report.series),
      ),
    ).toBe(true);
    expect(m.charts.some((c) => JSON.stringify(c.data) === JSON.stringify(report.statuses))).toBe(
      true,
    );
    expect(
      m.charts.some((c) =>
        c.data.some((v) => v.method === "Pix" && v.Pago === 1 && v.Pendente === 1),
      ),
    ).toBe(true);
    expect(screen.getAllByText(/97,70/).length).toBeGreaterThan(0);
  });
  it("sends the selected custom dates to the backend instead of filtering stale browser data", async () => {
    show();
    await screen.findByText("PLA teste");
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-10-05" } });
    await waitFor(() =>
      expect(m.rpc).toHaveBeenCalledWith("admin_financial_report", {
        p_start: "2026-10-01",
        p_end: "2026-10-05",
      }),
    );
  });
  it("does not present failed queries as zero revenue and allows retry", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.queryByText(/R\$.*0,00/)).not.toBeInTheDocument();
    m.rpc.mockResolvedValue({ data: report, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("PLA teste")).toBeInTheDocument();
  });
});
