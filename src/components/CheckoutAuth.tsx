import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function CheckoutAuth() {
  const { user } = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/checkout" },
        });
        if (error) throw error;
        setMessage(
          data.session
            ? "Conta criada. Continue o pagamento com o mesmo e-mail."
            : "Confira seu e-mail para confirmar o cadastro. Mantenha esta página aberta para preservar seus dados de entrega.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setMessage("Acesso confirmado. Continue seu pagamento.");
      }
      setPassword("");
    } catch {
      setMessage(
        register
          ? "Não foi possível criar a conta. Confira os dados ou tente entrar se já tem cadastro."
          : "Não foi possível entrar. Confira seu e-mail e sua senha e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (user)
    return (
      <p className="rounded-lg border border-border p-4 text-sm">
        Você está conectado como <strong>{user.email}</strong>. Use este e-mail nos dados do pedido.
      </p>
    );
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="font-bold">
        {register ? "Criar conta para continuar" : "Entre para concluir sua compra"}
      </h2>
      <p className="text-sm text-muted-foreground">
        Sua conta protege os dados do pedido. Você continua nesta página, com seu carrinho e os
        dados preenchidos.
      </p>
      <label className="block text-sm">
        E-mail da conta
        <input
          required
          type="email"
          autoComplete="email"
          maxLength={160}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-input bg-background p-3"
        />
      </label>
      <label className="block text-sm">
        Senha da conta
        <input
          required
          type="password"
          minLength={6}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-input bg-background p-3"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Aguarde..." : register ? "Criar conta e continuar" : "Entrar e continuar"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setMessage("");
        }}
        className="block text-sm text-primary underline"
      >
        {register ? "Já tenho conta" : "Ainda não tenho conta"}
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
