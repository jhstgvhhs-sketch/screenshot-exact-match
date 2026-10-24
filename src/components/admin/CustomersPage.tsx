import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/store";
import { OrdersPage } from "./OrdersPage";
import { Panel, Pager, QueryState, field, action, adminDate } from "./AdminUi";
type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  orders: number;
  paid_total: number;
};
export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ["admin-customers", term, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_customer_page" as never,
        { p_search: term, p_page: page } as never,
      );
      if (error) throw error;
      return data as unknown as { count: number; rows: Customer[] };
    },
  });
  if (selected)
    return (
      <div className="space-y-5">
        <button className={action} onClick={() => setSelected(null)}>
          Voltar aos clientes
        </button>
        <h2 className="text-xl font-bold">{selected.full_name || "Cliente sem nome"}</h2>
        <OrdersPage userId={selected.id} />
      </div>
    );
  return (
    <div className="space-y-5">
      <input
        className={field + " max-w-md"}
        placeholder="Buscar nome ou telefone"
        aria-label="Buscar clientes"
        maxLength={150}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <QueryState
        loading={query.isLoading}
        error={query.isError}
        empty={query.data?.count === 0}
        retry={() => void query.refetch()}
      />
      {query.data && !query.isError && (
        <Panel title="Clientes cadastrados">
          <p className="mb-4 text-xs text-muted-foreground">
            E-mail exibido somente quando informado em um pedido. Total de compras inclui apenas
            pedidos pagos, excluindo cancelados.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Cliente",
                    "Contato",
                    "Cadastro",
                    "Pedidos",
                    "Compras confirmadas",
                    "Ações",
                  ].map((t) => (
                    <th key={t} className="pb-3 pr-3">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-4 pr-3 font-semibold">{c.full_name || "Não informado"}</td>
                    <td className="pr-3 text-xs">
                      {c.email || "Sem e-mail no histórico"}
                      <p className="mt-1 text-muted-foreground">{c.phone || "Sem telefone"}</p>
                    </td>
                    <td className="pr-3 text-xs">{adminDate(c.created_at)}</td>
                    <td>{c.orders}</td>
                    <td>{brl(c.paid_total)}</td>
                    <td>
                      <button className={action} onClick={() => setSelected(c)}>
                        Ver pedidos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} count={query.data.count} onChange={setPage} />
        </Panel>
      )}
    </div>
  );
}
