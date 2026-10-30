CREATE OR REPLACE FUNCTION public.admin_customer_page(
  p_search text DEFAULT '',
  p_page integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING errcode='42501';
  END IF;
  IF p_page < 0 OR p_page > 100000 OR length(p_search) > 150 THEN
    RAISE EXCEPTION 'Filtro inválido';
  END IF;
  WITH matches AS MATERIALIZED (
    SELECT p.id,p.full_name,p.phone,p.created_at
    FROM public.profiles p
    WHERE COALESCE(p.full_name,'') ILIKE '%'||p_search||'%'
       OR COALESCE(p.phone,'') ILIKE '%'||p_search||'%'
  ),
  page AS (
    SELECT * FROM matches ORDER BY created_at DESC,id LIMIT 25 OFFSET p_page*25
  ),
  rows AS (
    SELECT p.*,count(o.id) orders,
      COALESCE(sum(o.total) FILTER (
        WHERE o.payment_status IN ('paid','pago')
          AND o.status NOT IN ('cancelled','cancelado')
      ),0) paid_total,
      (array_agg(o.customer_email ORDER BY o.created_at DESC)
        FILTER (WHERE o.customer_email<>''))[1] email
    FROM page p
    LEFT JOIN public.orders o ON o.user_id=p.id
    GROUP BY p.id,p.full_name,p.phone,p.created_at
  )
  SELECT jsonb_build_object(
    'count',(SELECT count(*) FROM matches),
    'rows',COALESCE(jsonb_agg(to_jsonb(rows) ORDER BY created_at DESC,id),'[]')
  ) INTO result FROM rows;
  RETURN result;
END
$function$;

CREATE OR REPLACE FUNCTION public.admin_order_page(
  p_search text DEFAULT '',
  p_filter text DEFAULT 'all',
  p_page integer DEFAULT 0,
  p_archived boolean DEFAULT false,
  p_user uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING errcode='42501';
  END IF;
  IF p_page < 0 OR p_page > 100000 OR length(p_search) > 150
     OR p_filter NOT IN ('all','paid','pending','processing','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Filtro inválido';
  END IF;
  WITH matches AS MATERIALIZED (
    SELECT id,user_id,customer_name,customer_email,created_at,total,status,
      payment_status,payment_method,tracking_code,archived_at
    FROM public.orders o
    WHERE (p_archived OR archived_at IS NULL)
      AND (p_user IS NULL OR user_id=p_user)
      AND (p_search='' OR starts_with(lower(id::text),lower(p_search))
        OR strpos(lower(customer_name),lower(p_search))>0
        OR strpos(lower(customer_email),lower(p_search))>0)
      AND (
        p_filter='all'
        OR (p_filter='paid' AND payment_status IN ('paid','pago') AND status NOT IN ('cancelled','cancelado'))
        OR (p_filter='pending' AND payment_status IN ('pending','pendente') AND status NOT IN ('cancelled','cancelado'))
        OR (p_filter='processing' AND status IN ('processing','processando','em_separacao','pagamento_confirmado'))
        OR (p_filter='shipped' AND status IN ('shipped','enviado'))
        OR (p_filter='delivered' AND status IN ('delivered','entregue'))
        OR (p_filter='cancelled' AND status IN ('cancelled','cancelado'))
      )
  ),
  page AS (
    SELECT * FROM matches ORDER BY created_at DESC,id LIMIT 25 OFFSET p_page*25
  )
  SELECT jsonb_build_object(
    'count',(SELECT count(*) FROM matches),
    'rows',COALESCE(jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id),'[]')
  ) INTO result FROM page;
  RETURN result;
END
$function$;
