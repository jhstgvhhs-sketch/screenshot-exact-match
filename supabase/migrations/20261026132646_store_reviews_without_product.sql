begin;
-- A NULL product identifies feedback about the store; existing product links stay intact.
alter table public.product_reviews alter column product_id drop not null;
-- Existing RLS continues to require authenticated submissions, moderation and honest provenance.
notify pgrst,'reload schema';
commit;
