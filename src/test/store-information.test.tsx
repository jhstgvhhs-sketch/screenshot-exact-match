import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreInformation } from "@/components/site/StoreInformation";
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: React.PropsWithChildren<{ to: string; params?: { slug: string } }>) => (
    <a href={params ? to.replace("$slug", params.slug) : to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/StoreSettings", () => ({
  useStoreSettings: () => ({
    data: { whatsapp: "", email: "", phone: "", legal_name: "", cnpj: "", address: "" },
    isPending: false,
    isError: false,
  }),
}));
afterEach(cleanup);
describe("Store information without invented commercial policies", () => {
  it("explains statutory rights without inventing return addresses or deadlines", () => {
    render(<StoreInformation section="trocas" />);
    expect(screen.getByRole("heading", { name: "Direito de arrependimento" })).toBeInTheDocument();
    expect(screen.getByText(/7 dias/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Código de Defesa do Consumidor" })).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm",
    );
    expect(screen.queryByText(/As condições detalhadas desta página/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CNPJ:/)).not.toBeInTheDocument();
  });
  it("uses confirmed checkout and freight conditions and preserves the policy links", () => {
    const view = render(<StoreInformation section="termos" />);
    expect(
      screen.getByText(/a geração de um código de pagamento não comprova quitação/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "trocas e devoluções" })).toHaveAttribute(
      "href",
      "/info/trocas",
    );
    view.unmount();
    render(<StoreInformation section="envio" />);
    expect(screen.getByText(/O frete padrão exibido no checkout/)).toHaveTextContent(/37,80/);
    expect(screen.getByText(/O frete padrão exibido no checkout/)).toHaveTextContent(/600,00/);
  });
});
