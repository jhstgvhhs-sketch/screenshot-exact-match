-- Atomic Pix settlement. Apply in 3DFLEX Lovable Cloud before deploying webhook.
-- Locks the order, then ledger, so repeated callbacks cannot change inventory twice.
CREATE OR REPLACE FUNCTION public.settle_pix_order(
  p_order_id uuid,
  p_transaction_id text,
  p_amount_cents integer,
  p_gateway_status text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE; tx public.pix_transactions%ROWTYPE;
BEGIN
  IF p_gateway_status NOT IN ('paid','cancelled','expired') THEN
    RAISE EXCEPTION 'Invalid gateway status';
  END IF;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'unknown_order'; END IF;
  SELECT * INTO tx FROM public.pix_transactions
    WHERE order_id=p_order_id AND transaction_id=p_transaction_id FOR UPDATE;
  IF NOT FOUND OR tx.amount_cents<>p_amount_cents OR
     round(o.total*100)::integer<>p_amount_cents THEN RETURN 'mismatch'; END IF;
  IF tx.status='paid' THEN RETURN 'already_paid'; END IF;
  IF tx.status IN ('cancelled','expired') THEN RETURN 'already_closed'; END IF;
  IF o.payment_status<>'pendente' OR o.status<>'aguardando_pagamento' THEN
    RETURN 'manual_review';
  END IF;
  IF p_gateway_status='paid' THEN
    UPDATE public.orders SET payment_status='pago',status='pagamento_confirmado' WHERE id=p_order_id;
    UPDATE public.pix_transactions SET status='paid' WHERE order_id=p_order_id;
    RETURN 'paid';
  END IF;
  UPDATE public.orders SET payment_status=CASE WHEN p_gateway_status='expired' THEN 'expirado' ELSE 'cancelado' END,
    status='cancelado' WHERE id=p_order_id;
  UPDATE public.pix_transactions SET status=p_gateway_status WHERE order_id=p_order_id;
  UPDATE public.product_variants pv SET stock=pv.stock+v.qty
  FROM (SELECT variant_id,SUM(quantity)::integer qty FROM public.order_items
    WHERE order_id=p_order_id AND variant_id IS NOT NULL GROUP BY variant_id) v
  WHERE pv.id=v.variant_id;
  RETURN p_gateway_status;
END; $$;
REVOKE ALL ON FUNCTION public.settle_pix_order(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_pix_order(uuid,text,integer,text) TO service_role;
