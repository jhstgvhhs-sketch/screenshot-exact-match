// Pure payload builder shared with tests. Never accepts prices from the browser.
type Order = {
  total: number | string; shipping: number | string;
  customer_name: string; customer_email: string; customer_phone: string; customer_cpf: string;
  ship_street: string; ship_number: string; ship_complement?: string | null;
  ship_district: string; ship_city: string; ship_state: string; ship_cep: string;
};
type Line = { category_slug?: string | null; product_name: string; unit_price: number | string; quantity: number };
const digits = (value: string) => value.replace(/\D/g, "");
const cents = (value: number | string) => Math.round(Number(value) * 100);

export type PixShippingRules = {
  fixedShippingCents: number;
  freeThresholdCents: number;
  freeEnabled: boolean;
};

// Defaults mirror the store's standard rules: R$ 37,80 fixed, free Pix shipping above R$ 600.
export const DEFAULT_PIX_SHIPPING_RULES: PixShippingRules = {
  fixedShippingCents: 3780,
  freeThresholdCents: 60000,
  freeEnabled: true,
};

// Same shipping decision place_order applies in the database, in cents, so the
// checkout can validate the charge before any order exists.
export function pixShippingCents(
  subtotalCents: number,
  hasPrinter: boolean,
  rules: PixShippingRules = DEFAULT_PIX_SHIPPING_RULES,
): number {
  if (hasPrinter) return 0;
  if (rules.freeEnabled && subtotalCents > rules.freeThresholdCents) return 0;
  return rules.fixedShippingCents;
}

export function blackcatPixPayload(
  order: Order,
  lines: Line[],
  orderId: string,
  postbackUrl: string,
  rules: PixShippingRules = DEFAULT_PIX_SHIPPING_RULES,
) {
  const amount = cents(order.total);
  const shipping = cents(order.shipping);
  const cpf = digits(order.customer_cpf);
  if (!/^\d{11}$/.test(cpf)) throw new Error("CPF inválido");
  if (!Number.isSafeInteger(amount) || amount <= 0 || !lines.length)
    throw new Error("Total ou frete inválido");
  const subtotal = lines.reduce((sum, line) => sum + cents(line.unit_price) * line.quantity, 0);
  const hasPrinter = lines.some(line => line.category_slug === "impressoras");
  // Zero freight is only valid when the store settings themselves produce it:
  // a zero fixed rate, a printer in the cart, or free Pix shipping above the threshold.
  const zeroFreightAllowed =
    rules.fixedShippingCents === 0 || hasPrinter ||
    (rules.freeEnabled && subtotal > rules.freeThresholdCents);
  if (shipping !== rules.fixedShippingCents && !(shipping === 0 && zeroFreightAllowed))
    throw new Error("Total ou frete inválido");
  const items = lines.map(line => {
    const unitPrice = cents(line.unit_price);
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10)
      throw new Error("Item inválido");
    return { title: line.product_name, quantity: line.quantity, unitPrice, tangible: true };
  });
  if (items.reduce((sum, item) => sum + item.unitPrice * item.quantity, shipping) !== amount)
    throw new Error("Total não corresponde aos itens e frete");
  return {
    amount, currency: "BRL", paymentMethod: "pix", externalRef: orderId, postbackUrl,
    items: shipping > 0 ? [...items, { title: "Frete", quantity: 1, unitPrice: shipping, tangible: false }] : items,
    customer: { name: order.customer_name, email: order.customer_email,
      phone: digits(order.customer_phone), document: { number: cpf, type: "cpf" } },
    shipping: { name: order.customer_name, street: order.ship_street,
      number: order.ship_number, complement: order.ship_complement ?? "", neighborhood: order.ship_district,
      city: order.ship_city, state: order.ship_state.toUpperCase(), zipCode: digits(order.ship_cep) },
  };
}
