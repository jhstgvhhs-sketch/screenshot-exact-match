export type TrackingOrder = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  tracking_carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
};
export function trackingUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.length > 2048 || /[\s\\@]/.test(raw))
    throw new Error("Use um link HTTPS válido do site oficial da transportadora.");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Use um link HTTPS válido do site oficial da transportadora.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !/^[a-z]{2,63}$/i.test(url.hostname.split(".").at(-1) ?? "") ||
    url.hostname.split(".").length < 2 ||
    !url.hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  )
    throw new Error("Use um link HTTPS válido do site oficial da transportadora.");
  return url.toString();
}
const ddds = new Set(
  "11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(
    " ",
  ),
);
export function brazilPhone(value: string): string | null {
  if (!/^[+()\d\s.-]+$/.test(value.trim())) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith("55")) return null;
    digits = digits.slice(2);
  }
  if (
    !ddds.has(digits.slice(0, 2)) ||
    !(
      (digits.length === 11 && digits[2] === "9") ||
      (digits.length === 10 && /[2-5]/.test(digits[2]))
    )
  )
    return null;
  return "55" + digits;
}
export function trackingReady(order: TrackingOrder) {
  if (!["shipped", "enviado"].includes(order.status))
    throw new Error("Marque o pedido como enviado no andamento antes de notificar o cliente.");
  if (
    !order.tracking_carrier?.trim() ||
    !order.tracking_code?.trim() ||
    !order.tracking_url?.trim()
  )
    throw new Error("Salve a transportadora, o código e o link oficial antes de notificar.");
  trackingUrl(order.tracking_url);
}
export function trackingMessage(order: TrackingOrder) {
  trackingReady(order);
  return `📦 3DFLEX — SEU PEDIDO FOI ENVIADO!\n\nOlá, ${order.customer_name.trim() || "cliente"}!\n\nSeu pedido já está a caminho!\n\n📦 Pedido: #${order.id.slice(0, 8).toUpperCase()}\n\n🚚 Transportadora: ${order.tracking_carrier}\n\n🔎 Código de rastreamento: ${order.tracking_code}\n\n🔗 Acompanhe sua entrega:\n${trackingUrl(order.tracking_url!)}\n\nObrigado por comprar na 3DFLEX!`;
}
export function trackingWhatsApp(order: TrackingOrder) {
  const phone = brazilPhone(order.customer_phone);
  if (!phone) throw new Error("O telefone deste pedido não é um número brasileiro válido com DDD.");
  return `https://wa.me/${phone}?text=${encodeURIComponent(trackingMessage(order))}`;
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
export function trackingEmail(order: TrackingOrder) {
  const text = trackingMessage(order);
  const e = escapeHtml;
  return {
    subject: `3DFLEX — rastreamento do pedido #${order.id.slice(0, 8).toUpperCase()}`,
    text,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#101010;color:#f5f5f5;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:32px"><h1 style="color:#ff6a00">3DFLEX</h1><h2>Seu pedido foi enviado!</h2><p>Olá, ${e(order.customer_name.trim() || "cliente")}!</p><p>Seu pedido já está a caminho.</p><div style="padding:20px;background:#242424;border-radius:12px"><p>Pedido: <strong>#${e(order.id.slice(0, 8).toUpperCase())}</strong></p><p>Transportadora: ${e(order.tracking_carrier!)}</p><p>Código: <strong>${e(order.tracking_code!)}</strong></p></div><p style="margin:28px 0"><a href="${e(trackingUrl(order.tracking_url!))}" style="display:inline-block;background:#ff6a00;color:#101010;padding:14px 24px;border-radius:8px;font-weight:bold;text-decoration:none">RASTREAR PEDIDO</a></p><p>Obrigado por comprar na 3DFLEX!</p><p style="font-size:12px;color:#aaa">Mensagem de serviço referente ao seu pedido.</p></div></body></html>`,
  };
}
