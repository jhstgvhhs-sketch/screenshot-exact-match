-- Run in the 3DFLEX Lovable Cloud SQL Editor after review.
-- This routine is server-only and restores stock at most once.
CREATE OR REPLACE FUNCTION public.release_unpaid_order_stock(
  p_order_id uuid,
  p_payment_status text DEFAULT 'cancelado'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  IF p_payment_status NOT IN ('cancelado', 'expirado') THEN
    RAISE EXCEPTION 'Status inválido para liberação de estoque';
  END IF;

  UPDATE public.orders
  SET payment_status = p_payment_status,
      status = 'cancelado'
  WHERE id = p_order_id
    AND payment_status = 'pendente'
    AND status = 'aguardando_pagamento'
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.product_variants pv
  SET stock = pv.stock + reserved.qty
  FROM (
    SELECT oi.variant_id, SUM(oi.quantity)::integer AS qty
    FROM public.order_items oi
    WHERE oi.order_id = v_order_id AND oi.variant_id IS NOT NULL
    GROUP BY oi.variant_id
  ) reserved
  WHERE pv.id = reserved.variant_id;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.release_unpaid_order_stock(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_unpaid_order_stock(uuid, text) TO service_role;
-- IMPORTANT: only call this after verifying cancellation/expiration with Blackcat.
-- Never run a blanket UPDATE to release all pending orders.
