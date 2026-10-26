import { describe, expect, it } from 'vitest';
import { blackcatPixPayload } from '../../supabase/functions/_shared/blackcat-payload';
const order = { total: 97.7, shipping: 37.8, customer_name: 'Teste', customer_email: 'teste@example.com',
  customer_phone: '(11) 99999-9999', customer_cpf: '529.982.247-25', ship_street: 'Rua A', ship_number: '10',
  ship_complement: 'Apto 2', ship_district: 'Centro', ship_city: 'São Paulo', ship_state: 'sp', ship_cep: '01001-000' };
const lines = [{ product_name: 'Filamento PLA — Branco', unit_price: 59.9, quantity: 1 }];
describe('Blackcat Pix payload', () => {
  it('uses documented CPF and shipping fields and includes fixed freight in cents', () => {
    const result = blackcatPixPayload(order, lines, 'order-id', 'https://example.com/webhook');
    expect(result.amount).toBe(9770);
    expect(result.customer.document).toEqual({ number: '52998224725', type: 'cpf' });
    expect(result.shipping).toMatchObject({ number: '10', complement: 'Apto 2', state: 'SP', zipCode: '01001000' });
    expect(result.items.at(-1)).toEqual({ title: 'Frete', unitPrice: 3780, quantity: 1, tangible: false });
    expect(result.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)).toBe(result.amount);
  });
  it('supports ten units per color', () => {
    expect(blackcatPixPayload({ ...order, total: 636.8 }, [{ ...lines[0]!, quantity: 10 }], 'id', 'https://example.com').amount).toBe(63680);
  });
  it('rejects mismatched totals, altered freight, and invalid quantities', () => {
    expect(() => blackcatPixPayload({ ...order, total: 1 }, lines, 'id', 'https://example.com')).toThrow();
    expect(() => blackcatPixPayload({ ...order, shipping: 0 }, lines, 'id', 'https://example.com')).toThrow();
    for (const quantity of [0, 11, 1.5]) expect(() => blackcatPixPayload(order, [{ ...lines[0]!, quantity }], 'id', 'https://example.com')).toThrow();
  });
});

describe('Printer Pix payload eligibility', () => {
  it('accepts zero freight below R$ 600 only with a server-resolved printer category', () => {
    const printer = [{ product_name: 'Modelo cadastrado', category_slug: 'impressoras', unit_price: 500, quantity: 1 }];
    const result = blackcatPixPayload({ ...order, total: 500, shipping: 0 }, printer, 'id', 'https://example.com');
    expect(result.amount).toBe(50000);
    expect(result.items).toHaveLength(1);
    expect(() => blackcatPixPayload({ ...order, total: 500, shipping: 0 }, [{ ...printer[0], category_slug: 'acessorios', product_name: 'Impressora no título' }], 'id', 'https://example.com')).toThrow();
  });
});
