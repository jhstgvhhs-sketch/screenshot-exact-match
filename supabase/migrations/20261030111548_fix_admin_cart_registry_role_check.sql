CREATE OR REPLACE FUNCTION public.admin_cart_registry(
  p_page integer DEFAULT 0,
  p_status text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING errcode = '42501';
  END IF;
  IF p_page < 0 OR p_page > 100000 OR p_status NOT IN (
    'all','active','abandoned','recovering','recovered','expired','pending_payment','completed'
  ) THEN
    RAISE EXCEPTION 'Filtro inválido';
  END IF;
  PERFORM public.recovery_reconcile();
  WITH base AS (
    SELECT c.id,c.customer_name,c.email,c.phone,c.items,c.estimated_value,c.last_activity_at,
      c.expires_at,c.email_consent,c.whatsapp_consent,c.linked_order_id,
      CASE
        WHEN o.payment_status IN ('paid','pago') AND o.status NOT IN ('cancelado','cancelled') THEN 'recovered'
        WHEN o.status IN ('delivered','entregue','concluido','completed') THEN 'completed'
        WHEN o.payment_status IN ('pending','pendente') AND o.status NOT IN ('cancelado','cancelled') THEN 'pending_payment'
        WHEN c.status='expired' OR c.expires_at<=now() THEN 'expired'
        WHEN c.status='recovering' THEN 'recovering'
        WHEN c.last_activity_at<=now()-interval '30 minutes' THEN 'abandoned'
        ELSE 'active'
      END AS status,
      CASE WHEN o.payment_status IN ('paid','pago') AND o.status NOT IN ('cancelado','cancelled') THEN o.total ELSE 0 END AS confirmed_value
    FROM public.recovery_carts c
    LEFT JOIN public.orders o ON o.id=COALESCE(c.recovered_order_id,c.linked_order_id)
    WHERE c.parent_id IS NULL AND jsonb_array_length(c.items)>0
  ),
  filtered AS (SELECT * FROM base WHERE p_status='all' OR status=p_status),
  page AS (SELECT * FROM filtered ORDER BY last_activity_at DESC,id LIMIT 25 OFFSET p_page*25)
  SELECT jsonb_build_object(
    'carts',COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'),
    'count',(SELECT count(*) FROM filtered),
    'metrics',jsonb_build_object(
      'abandoned',(SELECT count(*) FROM base WHERE status='abandoned'),
      'potential',(SELECT COALESCE(sum(estimated_value),0) FROM base WHERE status='abandoned'),
      'recovered',(SELECT count(*) FROM base WHERE status='recovered'),
      'revenue',(SELECT COALESCE(sum(confirmed_value),0) FROM base WHERE status='recovered')
    )
  ) INTO result;
  RETURN result;
END;
$$;
