-- Keep anonymous storefront reads independent from the admin-only role helper.
-- The anon role intentionally has no EXECUTE privilege on public.has_role().
-- Split the public and authenticated SELECT rules so anonymous catalog requests
-- never evaluate has_role(), while authenticated admins retain access to drafts.

DROP POLICY IF EXISTS "Public can read active products" ON public.products;

CREATE POLICY "Public can read active products"
  ON public.products
  FOR SELECT
  TO anon
  USING (active);

CREATE POLICY "Authenticated can read active products and admins can read all"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'::public.app_role));


DROP POLICY IF EXISTS "Public can read variants of active products" ON public.product_variants;

CREATE POLICY "Public can read variants of active products"
  ON public.product_variants
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.active
    )
  );

CREATE POLICY "Authenticated can read variants of active products and admins can read all"
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_variants.product_id
        AND (
          p.active
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );


DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.product_reviews;

CREATE POLICY "Anyone can read approved reviews"
  ON public.product_reviews
  FOR SELECT
  TO anon
  USING (approved);

CREATE POLICY "Authenticated can read approved reviews and admins can read all"
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (
    approved
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
