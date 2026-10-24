import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";
type Cart = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  items: { name: string; color: string; quantity: number; price: number }[];
  estimated_value: number;
  status: string;
  last_activity_at: string;
  expires_at: string;
  email_consent: boolean;
  whatsapp_consent: boolean;
  linked_order_id: string | null;
};
type Registry = {
  carts: Cart[];
  count: number;
  metrics: { abandoned: number; potential: number; recovered: number; revenue: number };
};
const labels: Record<string, string> = {
  active: "Em andamento",
  abandoned: "Abandonado",
  recovering: "Recuperação iniciada",
  recovered: "Pagamento confirmado",
  expired: "Expirado",
  pending_payment: "Aguardando pagamento",
  completed: "Pedido concluído",
};
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export function CartRegistry() {
  const [page, setPage] = useState(0),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Cart | null>(null);
  const query = useQuery<Registry>({
    queryKey: ["cart-registry", page, filter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_cart_registry", {
        p_page: page,
        p_status: filter,
      });
      if (error) throw error;
      if (!data) throw new Error("Consulta sem resposta");
      return data as unknown as Registry;
    },
    retry: 1,
    refetchInterval: 60000,
  });
  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">CARRINHOS ABANDONADOS</h2>
      <p className="text-sm text-muted-foreground">
        Carrinhos registrados pela loja. Abandono após 30 minutos sem atividade, conforme o relógio
        do servidor. Envios automáticos de mensagens não estão ativados.
      </p>
      {query.isLoading ? (
        <p>Carregando carrinhos…</p>
      ) : query.isError || !query.data ? (
        <div role="alert" className="space-y-3">
          <p>
            Não foi possível consultar os carrinhos. Confira sua sessão administrativa e tente
            novamente.
          </p>
          <button
            type="button"
            className="text-primary underline"
            onClick={() => void query.refetch()}
          >
            Consultar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Carrinhos abandonados", query.data.metrics.abandoned],
              ["Valor potencial (sem frete)", brl(Number(query.data.metrics.potential))],
              ["Com pagamento confirmado", query.data.metrics.recovered],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-xl font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>
          <label className="block max-w-sm text-sm">
            Status do carrinho
            <select
              className="mt-1 w-full rounded-lg border bg-background p-2"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(0);
                setSelected(null);
              }}
            >
              <option value="all">Todos</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!query.data.count ? (
            <p className="rounded-lg border p-4 text-sm">
              Nenhum carrinho neste filtro. Novas adições ao carrinho serão registradas a partir
              desta versão.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "CLIENTE",
                      "CONTATO",
                      "PRODUTOS",
                      "VALOR",
                      "ÚLTIMA ATIVIDADE",
                      "STATUS",
                      "AÇÕES",
                    ].map((label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.carts.map((cart) => (
                    <tr key={cart.id} className="border-t">
                      <td className="p-3">{cart.customer_name || "Visitante"}</td>
                      <td className="p-3">
                        {cart.email || "Sem e-mail"}
                        <br />
                        {cart.phone || "Sem telefone"}
                      </td>
                      <td className="max-w-xs p-3">
                        {cart.items
                          .map((item) => `${item.name} · ${item.color} × ${item.quantity}`)
                          .join("; ")}
                      </td>
                      <td className="p-3">{brl(Number(cart.estimated_value))}</td>
                      <td className="p-3">{date(cart.last_activity_at)}</td>
                      <td className="p-3">{labels[cart.status] ?? cart.status}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="text-primary underline"
                          onClick={() => setSelected(cart)}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              className="text-primary underline disabled:opacity-40"
              disabled={page === 0}
              onClick={() => {
                setPage(page - 1);
                setSelected(null);
              }}
            >
              Anterior
            </button>
            <span>
              Página {page + 1} · {query.data.count} carrinhos
            </span>
            <button
              type="button"
              className="text-primary underline disabled:opacity-40"
              disabled={(page + 1) * 25 >= query.data.count}
              onClick={() => {
                setPage(page + 1);
                setSelected(null);
              }}
            >
              Próxima
            </button>
            <button
              type="button"
              className="text-primary underline"
              onClick={() => void query.refetch()}
            >
              Atualizar
            </button>
          </div>
          {selected && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-bold">Detalhes · {selected.customer_name || "Visitante"}</h3>
              <p className="break-all text-xs">Identificador: {selected.id}</p>
              <ul className="space-y-2 text-sm">
                {selected.items.map((item, index) => (
                  <li key={index}>
                    {item.name} · {item.color} · {item.quantity} unidade(s) ·{" "}
                    {brl(item.price * item.quantity)}
                  </li>
                ))}
              </ul>
              <p className="text-sm">Expira em {date(selected.expires_at)}.</p>
              <p className="text-xs text-muted-foreground">
                Consentimento por e-mail: {selected.email_consent ? "sim" : "não"}. WhatsApp:{" "}
                {selected.whatsapp_consent ? "sim" : "não"}. Nenhuma mensagem é enviada por esta
                tela.
              </p>
              {selected.linked_order_id && (
                <p className="break-all text-xs">Pedido associado: {selected.linked_order_id}</p>
              )}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setSelected(null)}
              >
                Fechar detalhes
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
