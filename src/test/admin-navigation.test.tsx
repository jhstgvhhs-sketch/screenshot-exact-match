import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, search, children, ...props }: any) => (
    <a href={`${to}?section=${search.section}`} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn(async () => ({ error: null })) } },
}));
vi.mock("@/components/admin/FinancialDashboard", () => ({
  FinancialDashboard: () => <p>Indicadores financeiros selecionados</p>,
}));
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
let client: QueryClient;
beforeEach(() => {
  localStorage.clear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => {
  cleanup();
  client.clear();
});
const show = (section = "security") =>
  render(
    <QueryClientProvider client={client}>
      <AdminWorkspace section={section} identity="admin@example.test" />
    </QueryClientProvider>,
  );
describe("Admin navigation and mobile controls", () => {
  it("keeps deep links to dedicated workspaces and only mounts the selected tool", () => {
    show();
    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute(
      "href",
      "/admin?section=orders",
    );
    expect(screen.getByRole("link", { name: "Carrinhos abandonados" })).toHaveAttribute(
      "href",
      "/admin?section=carts",
    );
    expect(screen.getByRole("link", { name: "Configurar frete" })).toHaveAttribute(
      "href",
      "/admin?section=shipping-settings",
    );
    expect(screen.getByRole("link", { name: "Segurança" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Gestão de pedidos")).not.toBeInTheDocument();
    expect(screen.getByText("Acesso administrativo")).toBeInTheDocument();
  });
  it("opens and closes the mobile sidebar", () => {
    show();
    const open = screen.getByRole("button", { name: "Abrir navegação" });
    expect(open).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(open);
    expect(open).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Fechar navegação" }));
    expect(open).toHaveAttribute("aria-expanded", "false");
  });
  it("persists the collapsed desktop menu without changing shop configuration", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }));
    expect(localStorage.getItem("3dflex-admin-sidebar")).toBe("collapsed");
    expect(screen.getByRole("button", { name: "Expandir menu" })).toBeInTheDocument();
  });
});
