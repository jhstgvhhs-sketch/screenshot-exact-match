import type { ReactNode } from "react";
export const field = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm";
export const action =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40";
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card/50 p-4 sm:p-6">
      <h2 className="mb-5 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
export function QueryState({
  loading,
  error,
  empty,
  retry,
}: {
  loading: boolean;
  error: boolean;
  empty?: boolean;
  retry: () => void;
}) {
  return loading ? (
    <div role="status" className="animate-pulse rounded-xl bg-muted p-8 text-muted-foreground">
      Carregando dados…
    </div>
  ) : error ? (
    <div role="alert" className="rounded-xl border border-destructive/40 p-5">
      <p>
        Não foi possível consultar os dados. Confira sua sessão, as permissões e a migração
        administrativa.
      </p>
      <button className={action + " mt-3"} onClick={retry}>
        Tentar novamente
      </button>
    </div>
  ) : empty ? (
    <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
      Nenhum registro encontrado para estes filtros.
    </p>
  ) : null;
}
export function Pager({
  page,
  count,
  onChange,
  size = 25,
}: {
  page: number;
  count: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {count} registros · Página {page + 1} de {Math.max(1, Math.ceil(count / size))}
      </span>
      <div className="flex gap-2">
        <button className={action} disabled={page === 0} onClick={() => onChange(page - 1)}>
          Anterior
        </button>
        <button
          className={action}
          disabled={(page + 1) * size >= count}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
export function Status({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">
      {children}
    </span>
  );
}
export const adminDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
