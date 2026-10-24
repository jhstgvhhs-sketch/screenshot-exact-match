import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), signin: vi.fn(), signout: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword: mocks.signin, signOut: mocks.signout } },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useSearch: () => ({ section: "dashboard" }),
  }),
}));
vi.mock("@/components/admin/AdminWorkspace", () => ({
  AdminWorkspace: ({ identity }: { identity: string }) => <div>Painel autorizado: {identity}</div>,
}));
import { AdminPage } from "@/routes/admin";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signin.mockResolvedValue({ error: null });
});
describe("Preserved admin access", () => {
  it("requires login and submits through the existing auth provider", async () => {
    mocks.auth.mockReturnValue({ user: null, isAdmin: false, loading: false });
    render(<AdminPage />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "local-test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no painel" }));
    await waitFor(() =>
      expect(mocks.signin).toHaveBeenCalledWith({
        email: "admin@example.test",
        password: "local-test-password",
      }),
    );
    expect(screen.queryByText(/Painel autorizado/)).not.toBeInTheDocument();
  });
  it("denies a normal logged-in user", () => {
    mocks.auth.mockReturnValue({ user: { id: "customer" }, isAdmin: false, loading: false });
    render(<AdminPage />);
    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(screen.queryByText(/Painel autorizado/)).not.toBeInTheDocument();
  });
  it("waits for the authorization check", () => {
    mocks.auth.mockReturnValue({ user: { id: "customer" }, isAdmin: true, loading: true });
    render(<AdminPage />);
    expect(screen.getByText("Verificando acesso...")).toBeInTheDocument();
    expect(screen.queryByText(/Painel autorizado/)).not.toBeInTheDocument();
  });
  it("mounts the workspace only for an authorized admin", () => {
    mocks.auth.mockReturnValue({
      user: { id: "admin", email: "admin@example.test" },
      isAdmin: true,
      loading: false,
    });
    render(<AdminPage />);
    expect(screen.getByText("Painel autorizado: admin@example.test")).toBeInTheDocument();
  });
});
