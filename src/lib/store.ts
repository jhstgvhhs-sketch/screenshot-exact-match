export { FIXED_SHIPPING_BRL as SHIPPING_FLAT } from "./shipping";

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type CepAddress = { cep: string; street: string; district: string; city: string; state: string };

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function maskCep(s: string) {
  const d = onlyDigits(s).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Consulta o endereço pelo CEP (ViaCEP, serviço público gratuito). */
export async function lookupCep(cep: string): Promise<CepAddress> {
  const d = onlyDigits(cep);
  if (d.length !== 8) throw new Error("CEP deve ter 8 dígitos");
  const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!res.ok) throw new Error("Não foi possível consultar o CEP");
  const j = await res.json();
  if (j.erro) throw new Error("CEP não encontrado");
  return { cep: maskCep(d), street: j.logradouro ?? "", district: j.bairro ?? "", city: j.localidade ?? "", state: j.uf ?? "" };
}

export const ORDER_STATUS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
  estornado: "Estornado",
};
