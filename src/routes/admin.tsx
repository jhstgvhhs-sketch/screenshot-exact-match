import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search.section === "string" ? search.section : "dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Painel Administrativo — 3DFLEX" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

export function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { section } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (registering) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage(
          data.session
            ? "Conta criada. O acesso administrativo precisa ser autorizado."
            : "Cadastro solicitado. Confira seu e-mail para confirmar a conta. O acesso administrativo precisa ser autorizado.",
        );
        setRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="container-x py-12">Verificando acesso...</section>;

  if (!user)
    return (
      <section className="container-x mx-auto max-w-lg py-12">
        <h1 className="text-3xl font-bold">Administração 3DFLEX</h1>
        <p className="mt-3 text-muted-foreground">
          Entre com sua conta ou crie uma nova. O acesso ao painel exige autorização administrativa.
        </p>
        <form
          onSubmit={authenticate}
          className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <label className="block text-sm font-semibold">
            E-mail
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background p-3"
            />
          </label>
          <label className="block text-sm font-semibold">
            Senha
            <input
              type="password"
              required
              autoComplete={registering ? "new-password" : "current-password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background p-3"
            />
          </label>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Aguarde..." : registering ? "Criar conta" : "Entrar no painel"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRegistering(!registering);
              setMessage("");
              setPassword("");
            }}
            className="w-full text-sm font-semibold text-primary underline"
          >
            {registering ? "Já tenho conta — Entrar" : "Não tenho conta — Criar conta"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Após criar a conta, confirme seu e-mail se solicitado. O cadastro não concede privilégios
          administrativos.
        </p>
      </section>
    );

  if (!isAdmin)
    return (
      <section className="container-x py-12">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-3 text-muted-foreground">
          Esta conta não possui permissão de administrador. Entre em contato com o responsável pela
          loja.
        </p>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="mt-4 rounded-lg border border-input px-4 py-2"
        >
          Sair da conta
        </button>
      </section>
    );

  return <AdminWorkspace section={section} identity={user.email ?? user.id} />;
}
