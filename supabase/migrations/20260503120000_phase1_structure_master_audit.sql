-- Fase 1 — Estrutura operacional (PRD §10) + auditoria genérica.
-- Pré-requisito: helpers public.is_admin_or_gestor() e perfis com RLS já alinhados (Fase 0).
-- Após aplicar: npm run types:gen (com CLI autenticada) para regenerar src/shared/types/database.ts.

-- ---------------------------------------------------------------------------
-- Tabelas mestras adicionais
-- ---------------------------------------------------------------------------

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_centers_name_key unique (name)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_key unique (name)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  email text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_code_key unique (code)
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subcategories_category_name_key unique (category_id, name)
);

create index if not exists subcategories_category_id_idx on public.subcategories (category_id);

-- ---------------------------------------------------------------------------
-- Auditoria genérica
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger de auditoria (SECURITY DEFINER — grava mesmo com RLS no destino)
-- ---------------------------------------------------------------------------

create or replace function public.log_row_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    insert into public.audit_logs (entity_type, entity_id, action, old_row, new_row, changed_by)
    values (tg_table_name::text, old.id, 'delete', to_jsonb(old), null, uid);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (entity_type, entity_id, action, old_row, new_row, changed_by)
    values (tg_table_name::text, new.id, 'update', to_jsonb(old), to_jsonb(new), uid);
    return new;
  elsif tg_op = 'INSERT' then
    insert into public.audit_logs (entity_type, entity_id, action, old_row, new_row, changed_by)
    values (tg_table_name::text, new.id, 'insert', null, to_jsonb(new), uid);
    return new;
  end if;
  return null;
end;
$$;

-- Aplica em todas as tabelas mestras de estrutura (inclui as já existentes na Fase 0)
do $body$
declare
  t text;
  tables text[] := array[
    'result_centers',
    'product_categories',
    'cost_centers',
    'subcategories',
    'brands',
    'suppliers',
    'units'
  ];
begin
  foreach t in array tables
  loop
    execute format('drop trigger if exists tr_audit_row on public.%I', t);
    execute format(
      'create trigger tr_audit_row after insert or update or delete on public.%I for each row execute function public.log_row_audit()',
      t
    );
  end loop;
end;
$body$;

-- updated_at em novas tabelas
do $body$
declare
  t text;
  tables text[] := array['cost_centers', 'subcategories', 'brands', 'suppliers', 'units'];
begin
  foreach t in array tables
  loop
    execute format('drop trigger if exists tr_touch_updated_at on public.%I', t);
    execute format(
      'create trigger tr_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t
    );
  end loop;
end;
$body$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.cost_centers enable row level security;
alter table public.subcategories enable row level security;
alter table public.brands enable row level security;
alter table public.suppliers enable row level security;
alter table public.units enable row level security;
alter table public.audit_logs enable row level security;

-- Leitura: qualquer usuário autenticado com perfil ativo
drop policy if exists structure_select_active_profiles on public.cost_centers;
create policy structure_select_active_profiles
  on public.cost_centers for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists structure_insert_admin_gestor_cc on public.cost_centers;
create policy structure_insert_admin_gestor_cc
  on public.cost_centers for insert to authenticated
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_update_admin_gestor_cc on public.cost_centers;
create policy structure_update_admin_gestor_cc
  on public.cost_centers for update to authenticated
  using ((select public.is_admin_or_gestor()))
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_delete_admin_gestor_cc on public.cost_centers;
create policy structure_delete_admin_gestor_cc
  on public.cost_centers for delete to authenticated
  using ((select public.is_admin_or_gestor()));

-- subcategories
drop policy if exists structure_select_active_profiles_sc on public.subcategories;
create policy structure_select_active_profiles_sc
  on public.subcategories for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists structure_insert_admin_gestor_sc on public.subcategories;
create policy structure_insert_admin_gestor_sc
  on public.subcategories for insert to authenticated
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_update_admin_gestor_sc on public.subcategories;
create policy structure_update_admin_gestor_sc
  on public.subcategories for update to authenticated
  using ((select public.is_admin_or_gestor()))
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_delete_admin_gestor_sc on public.subcategories;
create policy structure_delete_admin_gestor_sc
  on public.subcategories for delete to authenticated
  using ((select public.is_admin_or_gestor()));

-- brands
drop policy if exists structure_select_active_profiles_br on public.brands;
create policy structure_select_active_profiles_br
  on public.brands for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists structure_insert_admin_gestor_br on public.brands;
create policy structure_insert_admin_gestor_br
  on public.brands for insert to authenticated
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_update_admin_gestor_br on public.brands;
create policy structure_update_admin_gestor_br
  on public.brands for update to authenticated
  using ((select public.is_admin_or_gestor()))
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_delete_admin_gestor_br on public.brands;
create policy structure_delete_admin_gestor_br
  on public.brands for delete to authenticated
  using ((select public.is_admin_or_gestor()));

-- suppliers
drop policy if exists structure_select_active_profiles_sup on public.suppliers;
create policy structure_select_active_profiles_sup
  on public.suppliers for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists structure_insert_admin_gestor_sup on public.suppliers;
create policy structure_insert_admin_gestor_sup
  on public.suppliers for insert to authenticated
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_update_admin_gestor_sup on public.suppliers;
create policy structure_update_admin_gestor_sup
  on public.suppliers for update to authenticated
  using ((select public.is_admin_or_gestor()))
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_delete_admin_gestor_sup on public.suppliers;
create policy structure_delete_admin_gestor_sup
  on public.suppliers for delete to authenticated
  using ((select public.is_admin_or_gestor()));

-- units
drop policy if exists structure_select_active_profiles_un on public.units;
create policy structure_select_active_profiles_un
  on public.units for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists structure_insert_admin_gestor_un on public.units;
create policy structure_insert_admin_gestor_un
  on public.units for insert to authenticated
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_update_admin_gestor_un on public.units;
create policy structure_update_admin_gestor_un
  on public.units for update to authenticated
  using ((select public.is_admin_or_gestor()))
  with check ((select public.is_admin_or_gestor()));

drop policy if exists structure_delete_admin_gestor_un on public.units;
create policy structure_delete_admin_gestor_un
  on public.units for delete to authenticated
  using ((select public.is_admin_or_gestor()));

-- audit_logs: apenas admin/gestor leem; escrita só via trigger (SECURITY DEFINER)
drop policy if exists audit_logs_select_admin_gestor on public.audit_logs;
create policy audit_logs_select_admin_gestor
  on public.audit_logs for select to authenticated
  using ((select public.is_admin_or_gestor()));

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

revoke all on public.cost_centers, public.subcategories, public.brands, public.suppliers, public.units from anon;
grant select, insert, update, delete on public.cost_centers, public.subcategories, public.brands, public.suppliers, public.units to authenticated;
