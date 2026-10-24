import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Download, RefreshCw, TrendingUp, Wallet, ShoppingBag, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";
import {
  reportRange,
  saoPauloDay,
  financialCsv,
  type Period,
  type FinancialReport,
} from "@/lib/admin-finance";
import { Panel, QueryState, field, action } from "./AdminUi";
const tooltip = {
  backgroundColor: "#242424",
  border: "1px solid #454545",
  borderRadius: 8,
  color: "#f5f5f5",
};
const money = (value: unknown) => brl(Number(value));
export function FinancialDashboard({ reports = false }: { reports?: boolean }) {
  const [period, setPeriod] = useState<Period>("month");
  const [start, setStart] = useState(saoPauloDay());
  const [end, setEnd] = useState(saoPauloDay());
  let range: { from: string; to: string } | null = null;
  let rangeError = "";
  try {
    range = reportRange(period, start, end);
  } catch (e) {
    rangeError = (e as Error).message;
  }
  const query = useQuery<FinancialReport>({
    queryKey: ["admin-finance", range?.from, range?.to],
    enabled: !!range,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_financial_report" as never,
        { p_start: range!.from, p_end: range!.to } as never,
      );
      if (error) throw error;
      return data as unknown as FinancialReport;
    },
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
  const data = query.data;
  function exportCsv() {
    if (!data || !range) return;
    const url = URL.createObjectURL(
      new Blob([financialCsv(data, range.from, range.to)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `3dflex-financeiro-${range.from}-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const methodNames = [...new Set(data?.methods.map((m) => m.method))];
  const methods = methodNames.map((method) => ({
    method,
    Pago: data?.methods.find((m) => m.method === method && m.state === "Pago")?.quantity ?? 0,
    Pendente:
      data?.methods.find((m) => m.method === method && m.state === "Pendente")?.quantity ?? 0,
  }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {reports ? "Relatórios financeiros" : "Seu negócio em números"}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {reports ? "Análise de vendas" : "Visão geral"}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Atualizar indicadores"
            className={action}
            onClick={() => void query.refetch()}
            disabled={!range || query.isFetching}
          >
            <RefreshCw size={16} />
          </button>
          <button className={action} disabled={!data || !range} onClick={exportCsv}>
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4">
        <label className="min-w-44 text-xs text-muted-foreground">
          Período
          <select
            className={field + " mt-1"}
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            {[
              ["today", "Hoje"],
              ["yesterday", "Ontem"],
              ["7", "Últimos 7 dias"],
              ["30", "Últimos 30 dias"],
              ["month", "Mês atual"],
              ["custom", "Personalizado"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {period === "custom" && (
          <>
            <label className="text-xs">
              De
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={field + " mt-1"}
              />
            </label>
            <label className="text-xs">
              Até
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={field + " mt-1"}
              />
            </label>
          </>
        )}
        <p className="text-xs text-muted-foreground">America/Sao_Paulo · valores em reais</p>
      </div>
      {rangeError ? (
        <p role="alert" className="text-destructive">
          {rangeError}
        </p>
      ) : (
        <QueryState
          loading={query.isLoading}
          error={query.isError}
          retry={() => void query.refetch()}
        />
      )}
      {data && range && !query.isError && (
        <>
          {data.undatedPaid > 0 && (
            <div
              role="note"
              className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm"
            >
              <strong>
                {data.undatedPaid} pedido(s) pago(s) sem data de confirmação:{" "}
                {brl(data.undatedValue)}.
              </strong>{" "}
              Esses valores não entram nos indicadores por período. O histórico foi preservado;
              novos pagamentos registrarão a data após a migração.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Vendas de hoje", brl(data.today), "Dia atual", TrendingUp],
              ["Últimos 7 dias", brl(data.week), "Inclui hoje", TrendingUp],
              ["Faturamento mensal", brl(data.month), "Mês atual", Wallet],
              ["Ticket médio", brl(data.ticket), "Pedidos pagos no período", ShoppingBag],
              ["Pedidos pagos", data.paid, "Confirmação no período", ShoppingBag],
              ["Pedidos pendentes", data.pending, "Criados no período", Clock],
              ["Total de pedidos", data.total, "Criados no período", ShoppingBag],
              ["Valor pendente", brl(data.pendingValue), "Aguardando pagamento", Clock],
            ].map(([label, value, caption, Icon]) => {
              const MetricIcon = Icon as typeof Wallet;
              return (
                <article
                  key={String(label)}
                  className="rounded-xl border border-border bg-card/60 p-5"
                >
                  <div className="flex justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{String(label)}</p>
                    <MetricIcon size={16} className="shrink-0 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight">{String(value)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{String(caption)}</p>
                </article>
              );
            })}
          </div>
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Panel title="Evolução do faturamento">
              <div className="mb-4 flex items-baseline gap-3">
                <strong className="text-2xl">{brl(data.revenue)}</strong>
                <span className="text-xs text-muted-foreground">Confirmado no período</span>
              </div>
              <div
                className="h-64 min-w-0"
                role="img"
                aria-label={`Faturamento confirmado no período: ${brl(data.revenue)}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series}>
                    <defs>
                      <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff6a00" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#ff6a00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => String(v).slice(5).split("-").reverse().join("/")}
                      stroke="#999"
                      fontSize={11}
                      minTickGap={35}
                    />
                    <YAxis
                      stroke="#999"
                      fontSize={11}
                      width={65}
                      tickFormatter={(v) => `R$ ${v}`}
                    />
                    <Tooltip contentStyle={tooltip} formatter={money} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Faturamento"
                      stroke="#ff6a00"
                      fill="url(#revenue-fill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Consultar valores por dia</summary>
                {data.series.map((d) => (
                  <p key={d.date}>
                    {d.date.split("-").reverse().join("/")} · {brl(d.revenue)}
                  </p>
                ))}
              </details>
            </Panel>
            <Panel title="Pedidos por situação">
              {!data.statuses.length ? (
                <p className="text-muted-foreground">Nenhum pedido no período.</p>
              ) : (
                <div className="h-64" role="img" aria-label="Distribuição dos pedidos por situação">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.statuses} layout="vertical">
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={120}
                        tick={{ fill: "#aaa", fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltip} />
                      <Bar dataKey="quantity" name="Pedidos" fill="#ff6a00" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Métodos de pagamento">
              {!methods.length ? (
                <p className="text-muted-foreground">Nenhum pagamento no período.</p>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methods}>
                      <XAxis dataKey="method" stroke="#aaa" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="#aaa" />
                      <Tooltip contentStyle={tooltip} />
                      <Legend />
                      <Bar dataKey="Pago" fill="#ff6a00" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pendente" fill="#777" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Pagos pela confirmação; pendentes pela criação do pedido.
              </p>
            </Panel>
            <Panel title="Taxa de conversão">
              <p className="text-3xl font-bold text-muted-foreground">—</p>
              <p className="mt-4 text-sm">Dados de visitas ainda não disponíveis.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Não há fonte de sessões da loja integrada ao relatório. Cadastros e carrinhos não
                representam visitantes.
              </p>
            </Panel>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Produtos mais vendidos">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-3">Produto</th>
                      <th>Unidades</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p, i) => (
                      <tr key={p.product_id + p.product_name} className="border-t border-border">
                        <td className="flex items-center gap-3 py-3">
                          <span className="text-muted-foreground">{i + 1}º</span>
                          {p.image && (
                            <img
                              src={p.image}
                              alt=""
                              className="h-9 w-9 rounded object-cover"
                              loading="lazy"
                            />
                          )}
                          <span>{p.product_name}</span>
                        </td>
                        <td>{p.quantity}</td>
                        <td className="whitespace-nowrap">{brl(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.products.length && (
                  <p className="py-6 text-muted-foreground">
                    Nenhuma venda com confirmação datada neste período.
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="Ranking de cores">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-3">Cor / material</th>
                      <th>Unidades</th>
                      <th>Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.colors.map((c) => (
                      <tr key={c.color + c.material} className="border-t border-border">
                        <td className="py-3">
                          {c.color}
                          <span className="block text-xs text-muted-foreground">{c.material}</span>
                        </td>
                        <td>{c.quantity}</td>
                        <td>
                          {(
                            (100 * c.quantity) /
                            Math.max(
                              1,
                              data.colors.reduce((n, c) => n + c.quantity, 0),
                            )
                          ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.colors.length && (
                  <p className="py-6 text-muted-foreground">Nenhuma cor vendida no período.</p>
                )}
              </div>
            </Panel>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Faturamento inclui frete e considera cada pedido pago uma vez, inclusive arquivados,
            excluindo cancelados. Valores por produto, material e cor descontam o frete e rateiam os
            descontos proporcionalmente aos itens. Não representam lucro. O material só aparece
            quando foi registrado no item; o nome e a cor vêm do histórico da compra.
          </p>
          {reports && (
            <Panel title="Vendas por material">
              <div className="space-y-3">
                {data.materials.map((m) => (
                  <div
                    key={m.material}
                    className="flex flex-wrap justify-between gap-3 border-b border-border pb-3"
                  >
                    <span>{m.material}</span>
                    <span>
                      {m.quantity} unidades · {brl(m.revenue)}
                    </span>
                  </div>
                ))}
                {!data.materials.length && (
                  <p className="text-muted-foreground">Sem vendas no período.</p>
                )}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
