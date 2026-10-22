-- Only authenticated administrators may read customer profiles and all orders.
-- Existing customer policies are preserved.
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
DROP POLICY IF EXISTS "Admins can read customer profiles" ON public.profiles;
CREATE POLICY "Admins can read customer profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
CREATE POLICY "Admins can read all orders" ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can update order status" ON public.orders;
CREATE POLICY "Admins can update order status" ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
