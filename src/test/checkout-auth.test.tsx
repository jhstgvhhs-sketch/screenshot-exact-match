import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutAuth } from "@/components/CheckoutAuth";
const mocks = vi.hoisted(() => ({
  user: null as null | { email: string },
  login: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword: mocks.login, signUp: mocks.signup } },
}));
beforeEach(() => {
  mocks.user = null;
  mocks.login.mockResolvedValue({ error: null });
  mocks.signup.mockResolvedValue({ data: { session: null }, error: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const fill = () => {
  fireEvent.change(screen.getByLabelText("E-mail da conta"), {
    target: { value: "customer@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Senha da conta"), { target: { value: "test-password" } });
};
describe("Checkout inline authentication", () => {
  it("signs in without navigating away or clearing delivery data", async () => {
    render(
      <>
        <input aria-label="Dados de entrega preservados" defaultValue="Rua do cliente" />
        <CheckoutAuth />
      </>,
    );
    fill();
    fireEvent.click(screen.getByText("Entrar e continuar"));
    await screen.findByText(/Acesso confirmado/);
    expect(mocks.login).toHaveBeenCalledWith({
      email: "customer@example.test",
      password: "test-password",
    });
    expect(screen.getByLabelText("Dados de entrega preservados")).toHaveValue("Rua do cliente");
  });
  it("supports quick registration and explains email confirmation without claiming a session", async () => {
    render(<CheckoutAuth />);
    fireEvent.click(screen.getByText("Ainda não tenho conta"));
    fill();
    fireEvent.click(screen.getByText("Criar conta e continuar"));
    await screen.findByText(/Confira seu e-mail para confirmar/);
    expect(mocks.signup).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: window.location.origin + "/checkout" },
      }),
    );
  });
  it("keeps credentials private on authentication failure", async () => {
    mocks.login.mockResolvedValue({ error: { message: "technical backend error" } });
    render(<CheckoutAuth />);
    fill();
    fireEvent.click(screen.getByText("Entrar e continuar"));
    await screen.findByText(/Não foi possível entrar/);
    expect(screen.queryByText("technical backend error")).not.toBeInTheDocument();
  });
});
