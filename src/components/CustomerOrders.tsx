import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";
import { trackingUrl, missingTrackingColumns } from "@/lib/tracking";
const orderStatus: Record<string, string> = {
  pending: "Pendente",
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_confirmado: "Em preparação",
  processing: "Em preparação",
  em_separacao: "Em preparação",
  shipped: "Enviado",
  enviado: "Enviado",
  delivered: "Entregue",
  entregue: "Entregue",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
};
const payments: Record<string, string> = {
  pending: "Pendente",
  pendente: "Pendente",
  paid: "Pago",
  pago: "Pago",
  cancelado: "Cancelado",
  expirado: "Expirado",
};
export function CustomerOrders({ userId }: { userId: string }) {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["customer-orders", userId, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("orders")
        .select(
          "id,created_at,status,payment_status,total,tracking_code,tracking_carrier,tracking_url,ship_city,ship_state",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 25, page * 25 + 24);
      if (missingTrackingColumns(error)) {
        // Preserve existing order history during a staged migration, without masking permission errors.
        const legacy = await supabase
          .from("orders")
          .select("id,created_at,status,payment_status,total,tracking_code,ship_city,ship_state", {
            count: "exact",
          })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(page * 25, page * 25 + 24);
        if (legacy.error) throw legacy.error;
        return {
          rows: legacy.data.map((row) => ({ ...row, tracking_carrier: null, tracking_url: null })),
          count: legacy.count ?? 0,
        };
      }
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });
  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-bold">Meus pedidos</h2>
      {query.isLoading ? (
        <p>Carregando pedidos…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>
            Não foi possível consultar os pedidos. Verifique sua sessão e a atualização do
            rastreamento.
          </p>
          <button className="mt-2 text-primary underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : query.data?.count === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <p>Você ainda não tem pedidos registrados nesta conta.</p>
          <Link to="/produtos" className="mt-4 inline-block text-primary underline">
            Ver produtos
          </Link>
        </div>
      ) : (
        query.data?.rows.map((o) => {
          let url = "";
          try {
            url = trackingUrl(o.tracking_url ?? "");
          } catch {
            /* Never expose unsafe stored links. */
          }
          return (
            <article key={o.id} className="rounded-xl border border-border bg-card p-5">
              <p className="font-bold">Pedido {o.id.slice(0, 8).toUpperCase()}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}{" "}
                · {o.ship_city}/{o.ship_state}
              </p>
              <p className="mt-2">
                Total: <strong>{brl(Number(o.total))}</strong>
              </p>
              <p className="mt-1 text-sm">
                Status: {orderStatus[o.status] ?? o.status} · Pagamento:{" "}
                {payments[o.payment_status] ?? o.payment_status}
              </p>
              {o.tracking_carrier && (
                <p className="mt-3 text-sm">Transportadora: {o.tracking_carrier}</p>
              )}
              {o.tracking_code && (
                <p className="mt-2 break-all text-sm">Código de rastreamento: {o.tracking_code}</p>
              )}
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground"
                >
                  RASTREAR PEDIDO
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {["cancelled", "cancelado"].includes(o.status)
                    ? "Pedido cancelado."
                    : o.tracking_code
                      ? "O link oficial de rastreamento ainda não foi informado."
                      : "Seu pedido está sendo preparado. As informações de rastreamento aparecerão após o envio."}
                </p>
              )}
            </article>
          );
        })
      )}
      {query.data && query.data.count > 25 && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="text-primary disabled:opacity-40"
          >
            Anterior
          </button>
          <span>Página {page + 1}</span>
          <button
            disabled={(page + 1) * 25 >= query.data.count}
            onClick={() => setPage(page + 1)}
            className="text-primary disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
