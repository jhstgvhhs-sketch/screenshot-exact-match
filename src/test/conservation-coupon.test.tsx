import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConservationCoupon } from "@/components/ConservationCoupon";
import { OrderGifts } from "@/components/OrderGifts";
import { cardWhatsAppUrl } from "@/lib/checkout";
import { normalizeKitCoupon, type GiftItem } from "@/lib/conservation-kit";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
const gifts: GiftItem[] = [
  { name: "Sílica em gel", quantity: 2, unit: "kg" },
  { name: "Embalagens a vácuo", quantity: 10, unit: "unidades" },
];
const items = [
  {
    variantId: "v1",
    productSlug: "pla",
    name: "PLA MasterPrint",
    color: "Preto",
    quantity: 10,
    price: 59.9,
  },
];
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("Kit coupon checkout", () => {
  it("accepts accented names and displays server-calculated gifts", async () => {
    mocks.rpc.mockResolvedValue({ data: { kilograms: 10, kits: 2, gifts }, error: null });
    const changed = vi.fn();
    render(<ConservationCoupon items={items} disabled={false} onChange={changed} />);
    fireEvent.change(screen.getByLabelText("Cupom de brinde"), {
      target: { value: "kitconservaçao" },
    });
    fireEvent.click(screen.getByText("Aplicar cupom"));
    expect(await screen.findByText(/Cupom aplicado: 2/)).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("kit_conservation_preview", {
      _items: [{ variant_id: "v1", quantity: 10 }],
    });
    expect(changed).toHaveBeenLastCalledWith({
      code: "KITCONSERVACAO",
      ready: true,
      kilograms: 10,
      kits: 2,
      gifts,
    });
    fireEvent.click(screen.getByText("Remover cupom"));
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: "", gifts: [], ready: true }),
    );
  });
  it("recalculates when quantities change and blocks an insufficient cart", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { kilograms: 10, kits: 2, gifts } })
      .mockResolvedValueOnce({ data: { kilograms: 4, kits: 0, gifts: [] } });
    const changed = vi.fn();
    const view = render(<ConservationCoupon items={items} disabled={false} onChange={changed} />);
    fireEvent.change(screen.getByLabelText("Cupom de brinde"), {
      target: { value: "KITCONSERVACAO" },
    });
    fireEvent.click(screen.getByText("Aplicar cupom"));
    await screen.findByText(/Cupom aplicado/);
    view.rerender(
      <ConservationCoupon
        items={[{ ...items[0], quantity: 4 }]}
        disabled={false}
        onChange={changed}
      />,
    );
    await screen.findByText(/pelo menos 5 kg/);
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ ready: false, gifts: [], kits: 0 }),
    );
  });
  it("fails closed on server errors without inventing gifts", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("Offline") });
    const changed = vi.fn();
    render(<ConservationCoupon items={items} disabled={false} onChange={changed} />);
    fireEvent.change(screen.getByLabelText("Cupom de brinde"), {
      target: { value: "kitconservação" },
    });
    fireEvent.click(screen.getByText("Aplicar cupom"));
    await screen.findByText(/Não foi possível conferir/);
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ ready: false, gifts: [] }));
  });
  it("shows fulfilment quantities and includes gifts in the manual card message", () => {
    render(<OrderGifts value={gifts} />);
    expect(screen.getByText("2 kg de Sílica em gel — Grátis")).toBeInTheDocument();
    vi.stubEnv("VITE_CHECKOUT_WHATSAPP_NUMBER", "5511999999999");
    const text = new URL(cardWhatsAppUrl(items, 599, undefined, gifts)!).searchParams.get("text");
    expect(text).toContain("Brinde: 2 kg de Sílica em gel — Grátis");
    expect(text).toContain("636,80");
    expect(normalizeKitCoupon(" kitconservação ")).toBe("KITCONSERVACAO");
  });
});
