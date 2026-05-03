-- Fase 2b — Histórico, triggers AFTER, auditoria, RLS, grants.

create or replace function public.margin_pct_from_price_cost(p_price numeric, p_cost numeric)
returns numeric
language sql
immutable
set search_path to public
as $$
  select case
    when p_price is null or p_price = 0 then null
    else round(((p_price - coalesce(p_cost, 0)) / p_price) * 100::numeric, 2)
  end;
$$;

create or replace function public.trg_products_after_history()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    if new.registration_score is distinct from old.registration_score then
      insert into public.product_score_history (
        product_id, previous_score, new_score, pendencies_snapshot, changed_by
      ) values (
        new.id, old.registration_score, new.registration_score, new.pendencies, uid
      );
    end if;

    if new.management_cost is distinct from old.management_cost then
      insert into public.product_cost_history (product_id, previous_cost, new_cost, changed_by)
      values (new.id, old.management_cost, new.management_cost, uid);
    end if;

    if new.management_price is distinct from old.management_price then
      insert into public.product_price_history (
        product_id,
        previous_price,
        new_price,
        previous_cost_snapshot,
        new_cost_snapshot,
        previous_margin_pct,
        new_margin_pct,
        changed_by
      ) values (
        new.id,
        old.management_price,
        new.management_price,
        old.management_cost,
        new.management_cost,
        public.margin_pct_from_price_cost(old.management_price, old.management_cost),
        public.margin_pct_from_price_cost(new.management_price, new.management_cost),
        uid
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_products_after_history on public.products;
create trigger tr_products_after_history
  after update on public.products
  for each row
  execute function public.trg_products_after_history();

drop trigger if exists tr_touch_updated_at on public.products;
create trigger tr_touch_updated_at
  before update on public.products
  for each row
  execute function public.touch_updated_at();

drop trigger if exists tr_audit_row on public.products;
create trigger tr_audit_row
  after insert or update or delete on public.products
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.product_suppliers;
create trigger tr_audit_row
  after insert or update or delete on public.product_suppliers
  for each row
  execute function public.log_row_audit();

create or replace function public.can_manage_master_products()
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

alter table public.products enable row level security;
alter table public.product_suppliers enable row level security;
alter table public.product_cost_history enable row level security;
alter table public.product_price_history enable row level security;
alter table public.product_score_history enable row level security;

drop policy if exists products_select_active on public.products;
create policy products_select_active
  on public.products for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

drop policy if exists products_write_managers on public.products;
create policy products_write_managers
  on public.products for all to authenticated
  using ((select public.can_manage_master_products()))
  with check ((select public.can_manage_master_products()));

drop policy if exists product_suppliers_select_active on public.product_suppliers;
create policy product_suppliers_select_active
  on public.product_suppliers for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

drop policy if exists product_suppliers_write_managers on public.product_suppliers;
create policy product_suppliers_write_managers
  on public.product_suppliers for all to authenticated
  using ((select public.can_manage_master_products()))
  with check ((select public.can_manage_master_products()));

drop policy if exists product_cost_history_select on public.product_cost_history;
create policy product_cost_history_select
  on public.product_cost_history for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

drop policy if exists product_price_history_select on public.product_price_history;
create policy product_price_history_select
  on public.product_price_history for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

drop policy if exists product_score_history_select on public.product_score_history;
create policy product_score_history_select
  on public.product_score_history for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

revoke all on public.products, public.product_suppliers, public.product_cost_history,
  public.product_price_history, public.product_score_history from anon;

grant select, insert, update, delete on public.products, public.product_suppliers to authenticated;
grant select on public.product_cost_history, public.product_price_history, public.product_score_history to authenticated;

grant execute on function public.eval_product_registration(public.products) to authenticated;
