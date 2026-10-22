-- Update the secure order placement quantity limit to 10 per color.
-- Does not change existing stock or overwrite inventory reservations.
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS reserved_stock integer;
-- Existing orders used full stock reservation; preserve their accounting.
UPDATE public.order_items SET reserved_stock = quantity WHERE reserved_stock IS NULL;
ALTER TABLE public.order_items ALTER COLUMN reserved_stock SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.place_order(_items jsonb, _customer jsonb, _coupon text, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _order uuid;
  _sub numeric := 0;
  _disc numeric := 0;
  _ship numeric := 37.80;
  it jsonb;
  v record;
  c record;
  q integer;
  reserved integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Faça login para finalizar a compra'; END IF;
  IF _method NOT IN ('pix','cartao') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Carrinho inválido';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_items) a
    WHERE a->>'variant_id' IS NULL OR a->>'quantity' IS NULL
  ) THEN RAISE EXCEPTION 'Itens inválidos'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(_items)) <>
     (SELECT count(DISTINCT a->>'variant_id') FROM jsonb_array_elements(_items) a) THEN
    RAISE EXCEPTION 'Não é permitido repetir a mesma cor';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_items) a
    WHERE (a->>'quantity') IS NULL OR (a->>'quantity') !~ '^(10|[1-9])$'
  ) THEN RAISE EXCEPTION 'Permitido de 1 a 10 unidades por cor'; END IF;
  INSERT INTO public.orders(user_id,payment_method,customer_name,customer_email,customer_phone,customer_cpf,ship_cep,ship_street,ship_number,ship_complement,ship_district,ship_city,ship_state,subtotal,shipping,total)
  VALUES(_uid,_method,_customer->>'name',_customer->>'email',_customer->>'phone',NULLIF(_customer->>'cpf',''),_customer->>'cep',_customer->>'street',_customer->>'number',NULLIF(_customer->>'complement',''),_customer->>'district',_customer->>'city',_customer->>'state',0,_ship,0)
  RETURNING id INTO _order;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'quantity')::integer;
    SELECT pv.id,pv.color,pv.sku,pv.stock,p.id pid,p.name,p.price INTO v
    FROM public.product_variants pv JOIN public.products p ON p.id=pv.product_id
    WHERE pv.id=(it->>'variant_id')::uuid AND p.active FOR UPDATE OF pv;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
    -- Orders beyond on-hand stock are accepted as preorders; never allow negative inventory.
    reserved := LEAST(v.stock, q);
    UPDATE public.product_variants SET stock=stock-reserved WHERE id=v.id;
    INSERT INTO public.order_items(order_id,product_id,variant_id,product_name,color,sku,unit_price,quantity,reserved_stock)
    VALUES(_order,v.pid,v.id,v.name,v.color,v.sku,v.price,q,reserved);
    _sub := _sub+v.price*q;
  END LOOP;
  IF coalesce(_coupon,'')<>'' THEN
    SELECT * INTO c FROM public.coupons WHERE upper(code)=upper(_coupon) AND active AND (expires_at IS NULL OR expires_at>now());
    IF NOT FOUND THEN RAISE EXCEPTION 'Cupom inválido'; END IF;
    _disc := least(_sub,coalesce(round(_sub*c.percent_off/100,2),c.amount_off,0));
  END IF;
  UPDATE public.orders SET subtotal=_sub,discount=_disc,total=_sub-_disc+_ship,coupon_code=NULLIF(upper(_coupon),'') WHERE id=_order;
  RETURN _order;
END
$function$;

-- Only restore inventory actually reserved, not quantities accepted on preorder.
CREATE OR REPLACE FUNCTION public.release_unpaid_order_stock(
  p_order_id uuid, p_payment_status text DEFAULT 'cancelado'
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order_id uuid;
BEGIN
  IF p_payment_status NOT IN ('cancelado', 'expirado') THEN
    RAISE EXCEPTION 'Status inválido para liberação de estoque';
  END IF;
  UPDATE public.orders
  SET payment_status = p_payment_status, status = 'cancelado'
  WHERE id = p_order_id AND payment_status = 'pendente'
    AND status = 'aguardando_pagamento'
  RETURNING id INTO v_order_id;
  IF v_order_id IS NULL THEN RETURN false; END IF;
  UPDATE public.product_variants pv SET stock = pv.stock + r.qty
  FROM (SELECT variant_id, SUM(COALESCE(reserved_stock,quantity))::integer qty
        FROM public.order_items WHERE order_id = v_order_id AND variant_id IS NOT NULL
        GROUP BY variant_id) r WHERE pv.id=r.variant_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.release_unpaid_order_stock(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_unpaid_order_stock(uuid,text) TO service_role;
