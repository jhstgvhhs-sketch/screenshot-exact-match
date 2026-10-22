-- Frete grátis para subtotal de produtos acima de R$ 600,00 exclusivamente no Pix.
-- Preserva a validação de até 10 unidades por variante e o estoque sob encomenda.
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
  -- Promotion: only Pix orders with merchandise subtotal strictly above R$ 600.
  _ship := CASE WHEN _method = 'pix' AND _sub > 600 THEN 0 ELSE 37.80 END;
  UPDATE public.orders SET subtotal=_sub,discount=_disc,shipping=_ship,total=_sub-_disc+_ship,coupon_code=NULLIF(upper(_coupon),'') WHERE id=_order;
  RETURN _order;
END
$function$;

