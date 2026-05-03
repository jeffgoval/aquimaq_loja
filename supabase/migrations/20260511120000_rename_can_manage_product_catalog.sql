-- Renomeia helper de RLS de escrita em products / product_suppliers (PRD §6 — cadastro catálogo).
-- Substitui o identificador legado do primeiro rollout por can_manage_product_catalog.

create or replace function public.can_manage_product_catalog()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'gestor', 'cadastro')
  );
$$;

drop policy if exists products_write_managers on public.products;
create policy products_write_managers
  on public.products for all to authenticated
  using ((select public.can_manage_product_catalog()))
  with check ((select public.can_manage_product_catalog()));

drop policy if exists product_suppliers_write_managers on public.product_suppliers;
create policy product_suppliers_write_managers
  on public.product_suppliers for all to authenticated
  using ((select public.can_manage_product_catalog()))
  with check ((select public.can_manage_product_catalog()));

grant execute on function public.can_manage_product_catalog() to authenticated;

drop function if exists public.can_manage_master_products();
