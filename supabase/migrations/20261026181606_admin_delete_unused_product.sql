begin;
create or replace function public.admin_delete_unused_product(p_product uuid) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null or not public.has_role(_user_id=>auth.uid(),_role=>'admin'::public.app_role) then
  raise exception 'Acesso administrativo necessário' using errcode='42501';
 end if;
 -- Serialize against catalog changes and the existing checkout's variant stock locks.
 perform id from public.products where id=p_product for update;
 if not found then raise exception 'Produto não encontrado. Atualize a lista.'; end if;
 perform id from public.product_variants where product_id=p_product order by id for update;
 if exists(select 1 from public.order_items i where i.product_id=p_product or i.variant_id in(select id from public.product_variants where product_id=p_product)) then
  raise exception 'Este produto possui pedidos vinculados e não pode ser excluído. Use Desativar produto para preservar o histórico.';
 end if;
 if exists(select 1 from public.product_reviews where product_id=p_product) then
  raise exception 'Este produto possui avaliações. Gerencie as avaliações antes de excluir ou use Desativar produto.';
 end if;
 delete from public.products where id=p_product;
 return found;
end $$;
revoke all on function public.admin_delete_unused_product(uuid) from public,anon;
grant execute on function public.admin_delete_unused_product(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
