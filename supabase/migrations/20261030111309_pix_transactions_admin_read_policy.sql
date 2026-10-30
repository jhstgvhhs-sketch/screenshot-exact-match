DROP POLICY IF EXISTS "Admins can read Pix transactions" ON public.pix_transactions;
CREATE POLICY "Admins can read Pix transactions"
ON public.pix_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
