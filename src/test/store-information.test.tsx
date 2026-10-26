import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreInformation } from "@/components/site/StoreInformation";
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
    expect(
      screen.getByRole("heading", { name: "Arrependimento em compras pela internet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/7 dias/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Código de Defesa do Consumidor" })).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm",
    );
    expect(screen.queryByText(/As condições detalhadas desta página/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CNPJ:/)).not.toBeInTheDocument();
  });
  it("uses confirmed checkout and freight conditions and preserves the policy links", () => {
    render(<StoreInformation section="termos" />);
    expect(screen.getByText(/37,80/)).toHaveTextContent(/600,00/);
    expect(screen.getByText(/gerar um código Pix não significa/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consultar trocas e devoluções" })).toHaveAttribute(
      "href",
      "/info/trocas",
    );
  });
});
