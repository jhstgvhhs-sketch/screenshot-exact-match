-- NULL preserves the original homepage. [] intentionally removes its image.
alter table public.store_settings add column if not exists homepage_images jsonb default null;
create or replace function public.valid_homepage_images(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
 select case
  when value is null then true
  when jsonb_typeof(value) <> 'array' then false
  else jsonb_array_length(value) <= 8 and not exists (
   select 1 from jsonb_array_elements(value) image
   where jsonb_typeof(image) <> 'object'
    or jsonb_typeof(image->'url') is distinct from 'string'
    or jsonb_typeof(image->'alt') is distinct from 'string'
    or (image->>'url') !~ '^https://[^[:space:]]+$'
    or length(btrim(image->>'alt')) not between 1 and 180
  ) end
$$;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.store_settings'::regclass and conname='store_homepage_images_valid') then
  alter table public.store_settings add constraint store_homepage_images_valid check(public.valid_homepage_images(homepage_images));
 end if;
end $$;
comment on column public.store_settings.homepage_images is 'Ordered public homepage images, admin-managed through existing store_settings RLS. NULL uses original artwork; [] hides image.';
notify pgrst, 'reload schema';
