-- Admin-only reversible removal from active order lists.
-- Keep fiscal records, payment evidence, and inventory movements intact.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_active_archive_idx ON public.orders (archived_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.archive_order_admin(p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso restrito ao administrador';
  END IF;
  UPDATE public.orders SET archived_at = now()
  WHERE id = p_order_id AND archived_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.archive_order_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_order_admin(uuid) TO authenticated;
