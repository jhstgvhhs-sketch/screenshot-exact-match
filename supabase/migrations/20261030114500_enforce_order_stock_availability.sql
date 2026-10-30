CREATE OR REPLACE FUNCTION public.place_order(
  _items jsonb,
  _customer jsonb,
  _coupon text,
  _method text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  _kit jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Faça login para finalizar a compra'; END IF;

  _coupon := coalesce(nullif(btrim(_coupon), ''), nullif(btrim(_customer->>'coupon_code'), ''));
  IF translate(upper(_coupon),'ÇÃÁÀÂÉÊÍÓÔÕÚ','CAAAAEEIOOOU')='KITCONSERVACAO' THEN _coupon := 'KITCONSERVACAO'; END IF;
  IF _method NOT IN ('pix', 'cartao') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;

  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Carrinho inválido';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_items) a WHERE a->>'variant_id' IS NULL OR a->>'quantity' IS NULL) THEN
    RAISE EXCEPTION 'Itens inválidos';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(_items)) <>
     (SELECT count(DISTINCT a->>'variant_id') FROM jsonb_array_elements(_items) a) THEN
    RAISE EXCEPTION 'Não é permitido repetir a mesma cor';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_items) a WHERE (a->>'quantity') !~ '^(10|[1-9])$') THEN
    RAISE EXCEPTION 'Permitido de 1 a 10 unidades por cor';
  END IF;

  INSERT INTO public.orders (
    user_id, payment_method, customer_name, customer_email, customer_phone, customer_cpf,
    ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state,
    subtotal, shipping, total
  ) VALUES (
    _uid, _method, _customer->>'name', _customer->>'email', _customer->>'phone',
    NULLIF(_customer->>'cpf', ''), _customer->>'cep', _customer->>'street', _customer->>'number',
    NULLIF(_customer->>'complement', ''), _customer->>'district', _customer->>'city', _customer->>'state',
    0, _ship, 0
  ) RETURNING id INTO _order;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'quantity')::integer;
    SELECT pv.id,pv.color,pv.sku,pv.stock,p.id AS pid,p.name,p.price
    INTO v
    FROM public.product_variants pv
    JOIN public.products p ON p.id=pv.product_id
    WHERE pv.id=(it->>'variant_id')::uuid AND p.active
    FOR UPDATE OF pv;

    IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
    IF v.stock < q THEN
      RAISE EXCEPTION 'Estoque insuficiente para % (%) — disponível: %, solicitado: %',
        v.name,v.color,greatest(v.stock,0),q;
    END IF;

    reserved := q;
    UPDATE public.product_variants SET stock=stock-reserved WHERE id=v.id;
    INSERT INTO public.order_items (
      order_id,product_id,variant_id,product_name,color,sku,unit_price,quantity,reserved_stock
    ) VALUES (_order,v.pid,v.id,v.name,v.color,v.sku,v.price,q,reserved);
    _sub := _sub + v.price*q;
  END LOOP;

  IF _coupon='KITCONSERVACAO' THEN
    IF NOT EXISTS (SELECT 1 FROM public.coupons WHERE code='KITCONSERVACAO' AND active
      AND (expires_at IS NULL OR expires_at>now()) AND percent_off IS NULL AND amount_off IS NULL) THEN
      RAISE EXCEPTION 'Cupom indisponível';
    END IF;
    _kit := public.kit_conservation_preview(_items);
    IF (_kit->>'kits')::integer < 1 THEN RAISE EXCEPTION 'O cupom exige pelo menos 5 kg de filamentos MasterPrint'; END IF;
  ELSIF COALESCE(_coupon, '') <> '' THEN
    SELECT * INTO c FROM public.coupons WHERE upper(code)=upper(_coupon) AND active
      AND (expires_at IS NULL OR expires_at>now());
    IF NOT FOUND THEN RAISE EXCEPTION 'Cupom inválido'; END IF;
    _disc := LEAST(_sub,COALESCE(round(_sub*c.percent_off/100,2),c.amount_off,0));
  END IF;

  _ship := CASE
    WHEN EXISTS (
      SELECT 1 FROM public.order_items oi_printer
      JOIN public.products p_printer ON p_printer.id=oi_printer.product_id
      JOIN public.categories c_printer ON c_printer.id=p_printer.category_id
      WHERE oi_printer.order_id=_order AND c_printer.slug='impressoras'
    ) THEN 0
    WHEN _method='pix'
      AND COALESCE((SELECT free_pix_shipping_enabled FROM public.shipping_settings WHERE id='main'),true)
      AND _sub > COALESCE((SELECT free_pix_shipping_threshold_brl FROM public.shipping_settings WHERE id='main'),600)
    THEN 0
    ELSE COALESCE((SELECT fixed_shipping_brl FROM public.shipping_settings WHERE id='main'),37.80)
  END;

  UPDATE public.orders SET shipping=_ship,subtotal=_sub,discount=_disc,total=_sub-_disc+_ship,
    coupon_code=NULLIF(upper(_coupon),'') WHERE id=_order;
  IF _kit IS NOT NULL THEN UPDATE public.orders SET gift_items=_kit->'gifts' WHERE id=_order; END IF;
  RETURN _order;
END;
$function$;
