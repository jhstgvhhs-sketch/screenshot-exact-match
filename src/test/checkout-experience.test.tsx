import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutAddress } from "../components/CheckoutAddress";
import { PixPaymentStatus } from "../components/PixPaymentStatus";

const mocks = vi.hoisted(() => ({ readOrder: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.readOrder }) }) }) } }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("CEP lookup", () => {
  it("fills address fields while preserving manual edits made during lookup", async () => {
    vi.useFakeTimers();
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(done => { resolve = done; })));
    render(<CheckoutAddress fieldClass=""/>);
    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "01001-000" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    fireEvent.change(screen.getByLabelText("Rua / Avenida"), { target: { value: "Rua corrigida" } });
    await act(async () => { resolve({ ok: true, json: async () => ({ logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" }) }); });
    expect(screen.getByLabelText("CEP")).toHaveValue("01001000");
    expect(screen.getByLabelText("Rua / Avenida")).toHaveValue("Rua corrigida");
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo");
    expect(screen.getByLabelText("Estado (UF)")).toHaveValue("SP");
    expect(screen.getByLabelText("Número")).toHaveValue("");
  });

  it("allows manual address entry when CEP cannot be found", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) }));
    render(<CheckoutAddress fieldClass=""/>);
    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "00000000" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByText(/Preencha o endereço manualmente/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "Salvador" } });
    expect(screen.getByLabelText("Cidade")).toHaveValue("Salvador");
  });
});

describe("Pix confirmation", () => {
  it("does not approve a pending Pix and updates after server confirmation", async () => {
    vi.useFakeTimers();
    mocks.readOrder.mockResolvedValueOnce({ data: { payment_status: "pendente", status: "aguardando_pagamento" } })
      .mockResolvedValueOnce({ data: { payment_status: "pago", status: "pagamento_confirmado" } });
    render(<PixPaymentStatus orderId="order-1"><p>Código Pix</p></PixPaymentStatus>);
    await act(async () => {});
    expect(screen.queryByText("Pagamento confirmado!")).toBeNull();
    expect(screen.getByText("Código Pix")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText("Pagamento confirmado!")).toBeInTheDocument();
    expect(screen.queryByText("Código Pix")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(mocks.readOrder).toHaveBeenCalledTimes(2);
  });

  it("never approves a failed consultation", async () => {
    mocks.readOrder.mockResolvedValue({ data: null, error: { message: "Network error" } });
    render(<PixPaymentStatus orderId="order-2"><p>Código Pix</p></PixPaymentStatus>);
    expect(await screen.findByText(/Não conseguimos consultar/)).toBeInTheDocument();
    expect(screen.queryByText("Pagamento confirmado!")).toBeNull();
  });

  it("hides payment instructions for a cancelled order", async () => {
    mocks.readOrder.mockResolvedValue({ data: { payment_status: "cancelado", status: "cancelado" } });
    render(<PixPaymentStatus orderId="order-3"><p>Código Pix</p></PixPaymentStatus>);
    expect(await screen.findByText(/Este Pix foi encerrado/)).toBeInTheDocument();
    expect(screen.queryByText("Código Pix")).toBeNull();
  });
});
