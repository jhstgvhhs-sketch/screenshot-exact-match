import { OrderGifts } from "@/components/OrderGifts";
import { RemoveOrderButton } from "./RemoveOrderButton";
import { useState, useEffect } from "react";
import { OrderTracking } from "./OrderTracking";
import { missingTrackingColumns } from "@/lib/tracking";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";
import { Panel, Pager, QueryState, Status, field, action, adminDate } from "./AdminUi";
import type { Tables } from "@/integrations/supabase/types";
const statusLabels: Record<string, string> = {
  pending: "Aguardando pagamento",
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_confirmado: "Em preparação",
  processing: "Em preparação",
  processando: "Em preparação",
  em_separacao: "Em preparação",
  shipped: "Enviado",
  enviado: "Enviado",
  delivered: "Entregue",
  entregue: "Entregue",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
  paid: "Pago",
  pago: "Pago",
  pendente: "Pendente",
  expired: "Expirado",
  expirado: "Expirado",
  failed: "Falhou",
};
const label = (value: string | null) => (value ? (statusLabels[value] ?? value) : "Não informado");
const paymentMethod = (v: string | null) =>
  v === "pix" ? "Pix" : ["cartao", "card"].includes(v ?? "") ? "Cartão" : (v ?? "Não informado");
type Row = Pick<
  Tables<"orders">,
  | "id"
  | "user_id"
  | "customer_name"
  | "customer_email"
  | "created_at"
  | "total"
  | "status"
  | "payment_status"
  | "payment_method"
  | "tracking_code"
  | "archived_at"
>;
export function OrdersPage({
  initialFilter = "all",
  userId,
}: {
  initialFilter?: string;
  userId?: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(0);
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setFilter(initialFilter);
    setPage(0);
  }, [initialFilter]);
  const query = useQuery({
    queryKey: ["admin-orders", debounced, filter, page, archived, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_order_page" as never,
        {
          p_search: debounced.trim(),
          p_filter: filter,
          p_page: page,
          p_archived: archived,
          p_user: userId ?? null,
        } as never,
      );
      if (error) throw error;
      return data as unknown as { rows: Row[]; count: number };
    },
    staleTime: 15000,
  });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Buscar pedidos"
          value={search}
          maxLength={150}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, e-mail ou número do pedido"
          className={field + " max-w-md"}
        />
        <select
          aria-label="Filtrar pedidos"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className={field + " max-w-xs"}
        >
          {[
            ["all", "Todos"],
            ["paid", "Pagos"],
            ["pending", "Pendentes"],
            ["processing", "Em preparação"],
            ["shipped", "Enviados"],
            ["delivered", "Entregues"],
            ["cancelled", "Cancelados"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => {
              setArchived(e.target.checked);
              setPage(0);
            }}
          />
          Incluir arquivados
        </label>
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.isError}
        empty={query.data?.count === 0}
        retry={() => void query.refetch()}
      />
      {query.data && !query.isError && (
        <Panel title={userId ? "Histórico do cliente" : "Pedidos da loja"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {[
                    "Pedido",
                    "Cliente",
                    "Data",
                    "Total",
                    "Método",
                    "Financeiro",
                    "Entrega",
                    "Ações",
                  ].map((t) => (
                    <th key={t} className="px-2 pb-4">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-2 font-mono text-xs" title={o.id}>
                      {o.id.slice(0, 8).toUpperCase()}
                      {o.archived_at && (
                        <span className="block text-muted-foreground">Arquivado</span>
                      )}
                    </td>
                    <td className="p-2">
                      <p>{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                    </td>
                    <td className="whitespace-nowrap p-2 text-xs">{adminDate(o.created_at)}</td>
                    <td className="whitespace-nowrap p-2 font-semibold">{brl(o.total)}</td>
                    <td className="p-2">{paymentMethod(o.payment_method)}</td>
                    <td className="p-2">
                      <Status>{label(o.payment_status)}</Status>
                    </td>
                    <td className="p-2">
                      <Status>{label(o.status)}</Status>
                    </td>
                    <td className="space-y-2 p-2">
                      <button className={action} onClick={() => setSelected(o.id)}>
                        Detalhes
                      </button>
                      <RemoveOrderButton orderId={o.id} archived={!!o.archived_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} count={query.data.count} onChange={setPage} />
        </Panel>
      )}
      {selected && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto">
            <DialogTitle>Detalhes do pedido</DialogTitle>
            <DialogDescription>
              Consulte os itens, pagamento e entrega deste pedido.
            </DialogDescription>
            <button className={action + " mb-4"} autoFocus onClick={() => setSelected(null)}>
              Fechar detalhes
            </button>
            <OrderDetails id={selected} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
function OrderDetails({ id }: { id: string }) {
  const client = useQueryClient();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const query = useQuery({
    queryKey: ["admin-order-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,gift_items,customer_name,customer_email,customer_phone,created_at,total,subtotal,discount,shipping,status,payment_status,payment_method,tracking_code,tracking_carrier,tracking_url,ship_street,ship_number,ship_complement,ship_district,ship_city,ship_state,ship_cep,archived_at,order_items(id,product_name,color,quantity,unit_price,sku)",
        )
        .eq("id", id)
        .single();
      if (missingTrackingColumns(error)) {
        const legacy = await supabase
          .from("orders")
          .select(
            "id,gift_items,customer_name,customer_email,customer_phone,created_at,total,subtotal,discount,shipping,status,payment_status,payment_method,tracking_code,ship_street,ship_number,ship_complement,ship_district,ship_city,ship_state,ship_cep,archived_at,order_items(id,product_name,color,quantity,unit_price,sku)",
          )
          .eq("id", id)
          .single();
        if (legacy.error) throw legacy.error;
        return {
          ...legacy.data,
          tracking_carrier: null,
          tracking_url: null,
          trackingSchemaReady: false,
        };
      }
      if (error) throw error;
      return { ...data, trackingSchemaReady: true };
    },
  });
  useEffect(() => {
    if (query.data) {
      setStatus(query.data.status);
    }
  }, [query.data]);
  async function mutate(mode: "progress" | "paid") {
    if (
      mode === "paid" &&
      !window.confirm(
        "Você verificou o recebimento real no banco, extrato ou gateway? Esta ação registra pagamento recebido e não cobra o cliente.",
      )
    )
      return;
    if (!window.confirm("Confirmar atualização deste pedido?")) return;
    setBusy(true);
    setFeedback("");
    try {
      const updates = mode === "paid" ? { payment_status: "paid" } : { status };
      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("A alteração não foi confirmada.");
      setFeedback("Pedido atualizado.");
      await Promise.all(
        [
          "admin-orders",
          "admin-order-detail",
          "admin-finance",
          "admin-customers",
          "abandoned-carts",
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  const o = query.data;
  return (
    <>
      <QueryState
        loading={query.isLoading}
        error={query.isError}
        retry={() => void query.refetch()}
      />
      {o && (
        <div className="space-y-5">
          <h2 className="break-all text-xl font-bold">Pedido {o.id}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Panel title="Cliente">
              <p>{o.customer_name}</p>
              <p className="break-all text-sm text-muted-foreground">{o.customer_email}</p>
              <p className="text-sm">{o.customer_phone}</p>
            </Panel>
            <Panel title="Entrega">
              <p>
                {o.ship_street}, {o.ship_number} {o.ship_complement}
              </p>
              <p>
                {o.ship_district} · {o.ship_city}/{o.ship_state}
              </p>
              <p>CEP {o.ship_cep}</p>
              <p className="mt-2 text-sm">Rastreio: {o.tracking_code || "Não informado"}</p>
            </Panel>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-3">Produto / cor</th>
                  <th>Qtd.</th>
                  <th>Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {o.order_items.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="py-3">
                      {i.product_name}
                      <p className="text-xs text-muted-foreground">
                        {i.color} · {i.sku}
                      </p>
                    </td>
                    <td>{i.quantity}</td>
                    <td>{brl(i.unit_price)}</td>
                    <td>{brl(i.unit_price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Subtotal: {brl(o.subtotal)} · Desconto: {brl(o.discount)} · Frete: {brl(o.shipping)}
          </p>
          <OrderGifts value={o.gift_items} />
          <p className="text-xl font-bold">Total: {brl(o.total)}</p>
          <p>
            {paymentMethod(o.payment_method)} · <Status>{label(o.payment_status)}</Status>
          </p>
          <p className="text-xs text-muted-foreground">
            Criado em {adminDate(o.created_at)}. Histórico detalhado de alterações não registrado
            pelo sistema atual.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Andamento
              <select
                className={field + " mt-1"}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value={o.status}>{label(o.status)}</option>
                {["pending", "processing", "shipped", "delivered", "cancelled"]
                  .filter((s) => s !== o.status)
                  .map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {o.trackingSchemaReady ? (
            <OrderTracking
              key={JSON.stringify([o.id, o.tracking_carrier, o.tracking_code, o.tracking_url])}
              order={o}
              onSaved={async () => {
                await Promise.all([
                  client.invalidateQueries({ queryKey: ["admin-order-detail", id] }),
                  client.invalidateQueries({ queryKey: ["customer-orders"] }),
                  client.invalidateQueries({ queryKey: ["admin-orders"] }),
                ]);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              O rastreamento completo depende da nova migração. O código já registrado e os demais
              detalhes do pedido foram preservados.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className={action + " bg-primary text-primary-foreground"}
              disabled={busy || status === o.status}
              onClick={() => void mutate("progress")}
            >
              Salvar andamento
            </button>
            {!["paid", "pago"].includes(o.payment_status) && (
              <button className={action} disabled={busy} onClick={() => void mutate("paid")}>
                Confirmar pagamento recebido
              </button>
            )}
            <RemoveOrderButton orderId={o.id} archived={!!o.archived_at} disabled={busy} />
          </div>
          {feedback && <p role="status">{feedback}</p>}
        </div>
      )}
    </>
  );
}
