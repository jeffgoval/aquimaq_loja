-- Fase 12 — Matriz de permissões (UI), feature flags por role, exceções por utilizador, base para auditoria avançada.
-- Requer: profiles, audit_logs (leitura admin/gestor já existente no projeto).

-- ---------------------------------------------------------------------------
-- Função: apenas administradores ativos gerem matriz / flags / overrides.
-- ---------------------------------------------------------------------------

create or replace function public.crm_is_settings_admin()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = 'admin'
  );
$$;

revoke all on function public.crm_is_settings_admin() from public;
grant execute on function public.crm_is_settings_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Catálogo de permissões (chaves alinhadas com navigation.permissionKey)
-- ---------------------------------------------------------------------------

create table if not exists public.crm_permission_catalog (
  key text primary key,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.crm_role_permissions (
  role text not null
    check (role in (
      'admin', 'gestor', 'cadastro', 'compras', 'estoque', 'recebimento', 'oficina', 'financeiro', 'consulta'
    )),
  permission_key text not null references public.crm_permission_catalog (key) on delete cascade,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (role, permission_key)
);

create index if not exists crm_role_permissions_role_idx on public.crm_role_permissions (role);

-- ---------------------------------------------------------------------------
-- Feature flags por role
-- ---------------------------------------------------------------------------

create table if not exists public.crm_feature_catalog (
  flag_key text primary key,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.crm_feature_role_flags (
  flag_key text not null references public.crm_feature_catalog (flag_key) on delete cascade,
  role text not null
    check (role in (
      'admin', 'gestor', 'cadastro', 'compras', 'estoque', 'recebimento', 'oficina', 'financeiro', 'consulta'
    )),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (flag_key, role)
);

create index if not exists crm_feature_role_flags_role_idx on public.crm_feature_role_flags (role);

-- ---------------------------------------------------------------------------
-- Overrides por utilizador (PRD permissões avançadas)
-- ---------------------------------------------------------------------------

create table if not exists public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create index if not exists user_permission_overrides_user_idx on public.user_permission_overrides (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.crm_permission_catalog enable row level security;
alter table public.crm_role_permissions enable row level security;
alter table public.crm_feature_catalog enable row level security;
alter table public.crm_feature_role_flags enable row level security;
alter table public.user_permission_overrides enable row level security;

drop policy if exists crm_permission_catalog_select on public.crm_permission_catalog;
create policy crm_permission_catalog_select
  on public.crm_permission_catalog for select to authenticated
  using (true);

drop policy if exists crm_permission_catalog_insert_admin on public.crm_permission_catalog;
create policy crm_permission_catalog_insert_admin
  on public.crm_permission_catalog for insert to authenticated
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_permission_catalog_update_admin on public.crm_permission_catalog;
create policy crm_permission_catalog_update_admin
  on public.crm_permission_catalog for update to authenticated
  using ((select public.crm_is_settings_admin()))
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_permission_catalog_delete_admin on public.crm_permission_catalog;
create policy crm_permission_catalog_delete_admin
  on public.crm_permission_catalog for delete to authenticated
  using ((select public.crm_is_settings_admin()));

drop policy if exists crm_role_permissions_select on public.crm_role_permissions;
create policy crm_role_permissions_select
  on public.crm_role_permissions for select to authenticated
  using (
    (role = (select p.role from public.profiles p where p.id = auth.uid() limit 1))
    or (select public.crm_is_settings_admin())
  );

drop policy if exists crm_role_permissions_write_admin on public.crm_role_permissions;
create policy crm_role_permissions_write_admin
  on public.crm_role_permissions for insert to authenticated
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_role_permissions_update_admin on public.crm_role_permissions;
create policy crm_role_permissions_update_admin
  on public.crm_role_permissions for update to authenticated
  using ((select public.crm_is_settings_admin()))
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_role_permissions_delete_admin on public.crm_role_permissions;
create policy crm_role_permissions_delete_admin
  on public.crm_role_permissions for delete to authenticated
  using ((select public.crm_is_settings_admin()));

drop policy if exists crm_feature_catalog_select on public.crm_feature_catalog;
create policy crm_feature_catalog_select
  on public.crm_feature_catalog for select to authenticated
  using (true);

drop policy if exists crm_feature_catalog_insert_admin on public.crm_feature_catalog;
create policy crm_feature_catalog_insert_admin
  on public.crm_feature_catalog for insert to authenticated
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_feature_catalog_update_admin on public.crm_feature_catalog;
create policy crm_feature_catalog_update_admin
  on public.crm_feature_catalog for update to authenticated
  using ((select public.crm_is_settings_admin()))
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_feature_catalog_delete_admin on public.crm_feature_catalog;
create policy crm_feature_catalog_delete_admin
  on public.crm_feature_catalog for delete to authenticated
  using ((select public.crm_is_settings_admin()));

drop policy if exists crm_feature_role_flags_select on public.crm_feature_role_flags;
create policy crm_feature_role_flags_select
  on public.crm_feature_role_flags for select to authenticated
  using (
    (role = (select p.role from public.profiles p where p.id = auth.uid() limit 1))
    or (select public.crm_is_settings_admin())
  );

drop policy if exists crm_feature_role_flags_insert_admin on public.crm_feature_role_flags;
create policy crm_feature_role_flags_insert_admin
  on public.crm_feature_role_flags for insert to authenticated
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_feature_role_flags_update_admin on public.crm_feature_role_flags;
create policy crm_feature_role_flags_update_admin
  on public.crm_feature_role_flags for update to authenticated
  using ((select public.crm_is_settings_admin()))
  with check ((select public.crm_is_settings_admin()));

drop policy if exists crm_feature_role_flags_delete_admin on public.crm_feature_role_flags;
create policy crm_feature_role_flags_delete_admin
  on public.crm_feature_role_flags for delete to authenticated
  using ((select public.crm_is_settings_admin()));

drop policy if exists user_permission_overrides_select on public.user_permission_overrides;
create policy user_permission_overrides_select
  on public.user_permission_overrides for select to authenticated
  using (
    user_id = auth.uid()
    or (select public.crm_is_settings_admin())
  );

drop policy if exists user_permission_overrides_insert_admin on public.user_permission_overrides;
create policy user_permission_overrides_insert_admin
  on public.user_permission_overrides for insert to authenticated
  with check ((select public.crm_is_settings_admin()));

drop policy if exists user_permission_overrides_update_admin on public.user_permission_overrides;
create policy user_permission_overrides_update_admin
  on public.user_permission_overrides for update to authenticated
  using ((select public.crm_is_settings_admin()))
  with check ((select public.crm_is_settings_admin()));

drop policy if exists user_permission_overrides_delete_admin on public.user_permission_overrides;
create policy user_permission_overrides_delete_admin
  on public.user_permission_overrides for delete to authenticated
  using ((select public.crm_is_settings_admin()));

revoke all on public.crm_permission_catalog from anon, authenticated;
grant select on public.crm_permission_catalog to authenticated;
grant insert, update, delete on public.crm_permission_catalog to authenticated;

revoke all on public.crm_role_permissions from anon, authenticated;
grant select on public.crm_role_permissions to authenticated;
grant insert, update, delete on public.crm_role_permissions to authenticated;

revoke all on public.crm_feature_catalog from anon, authenticated;
grant select on public.crm_feature_catalog to authenticated;
grant insert, update, delete on public.crm_feature_catalog to authenticated;

revoke all on public.crm_feature_role_flags from anon, authenticated;
grant select on public.crm_feature_role_flags to authenticated;
grant insert, update, delete on public.crm_feature_role_flags to authenticated;

revoke all on public.user_permission_overrides from anon, authenticated;
grant select on public.user_permission_overrides to authenticated;
grant insert, update, delete on public.user_permission_overrides to authenticated;

-- ---------------------------------------------------------------------------
-- Índice auxiliar para filtros de auditoria (idempotente)
-- ---------------------------------------------------------------------------

create index if not exists audit_logs_filter_idx on public.audit_logs (created_at desc, entity_type, action);

-- ---------------------------------------------------------------------------
-- Seed: catálogo + matriz alinhada ao menu actual (PRD §6)
-- ---------------------------------------------------------------------------

insert into public.crm_permission_catalog (key, label, sort_order) values
  ('nav.dashboard', 'Painel da Casa', 10),
  ('nav.structure', 'Estrutura', 20),
  ('nav.products', 'Cadastro Mestre', 30),
  ('nav.inventory', 'Estoque', 40),
  ('nav.purchases', 'Compras', 50),
  ('nav.receiving', 'Recebimento', 60),
  ('nav.workshop', 'Oficina', 70),
  ('nav.tasks', 'Tarefas', 80),
  ('nav.indicators', 'Indicadores', 90),
  ('nav.management_panel', 'Painel Gerencial', 100),
  ('nav.financial_panel', 'Painel Financeiro', 110),
  ('nav.weekly_routine', 'Rotina Semanal', 120),
  ('nav.improvements', 'Melhorias', 130),
  ('nav.settings', 'Configurações', 140)
on conflict (key) do nothing;

insert into public.crm_feature_catalog (flag_key, label, sort_order) values
  ('feat.export_audit_csv', 'Exportar auditoria (CSV)', 10),
  ('feat.financial_panel', 'Mostrar Painel Financeiro no menu', 20),
  ('feat.experimental_improvements', 'Módulo Melhorias (experimental)', 30)
on conflict (flag_key) do nothing;

-- Matriz: (role, permission) = allowed se o role faz parte do grupo PRD do item de menu.
insert into public.crm_role_permissions (role, permission_key, allowed)
select r.role, c.key,
  case c.key
    when 'nav.dashboard' then r.role = any (array['admin','gestor','cadastro','compras','estoque','recebimento','oficina','financeiro','consulta']::text[])
    when 'nav.structure' then r.role = any (array['admin','gestor']::text[])
    when 'nav.products' then r.role = any (array['admin','gestor','cadastro']::text[])
    when 'nav.inventory' then r.role = any (array['admin','gestor','estoque']::text[])
    when 'nav.purchases' then r.role = any (array['admin','gestor','compras']::text[])
    when 'nav.receiving' then r.role = any (array['admin','gestor','recebimento']::text[])
    when 'nav.workshop' then r.role = any (array['admin','gestor','oficina']::text[])
    when 'nav.tasks' then r.role = any (array['admin','gestor','cadastro','compras','estoque','recebimento','oficina','financeiro','consulta']::text[])
    when 'nav.indicators' then r.role = any (array['admin','gestor']::text[])
    when 'nav.management_panel' then r.role = any (array['admin','gestor','financeiro']::text[])
    when 'nav.financial_panel' then r.role = any (array['admin','gestor','financeiro']::text[])
    when 'nav.weekly_routine' then r.role = any (array['admin','gestor']::text[])
    when 'nav.improvements' then r.role = any (array['admin','gestor']::text[])
    when 'nav.settings' then r.role = any (array['admin','gestor']::text[])
    else false
  end as allowed
from (
  select unnest(array['admin','gestor','cadastro','compras','estoque','recebimento','oficina','financeiro','consulta']::text[]) as role
) r
cross join public.crm_permission_catalog c
on conflict (role, permission_key) do nothing;

-- Feature flags iniciais: export de auditoria para admin+gestor; painel financeiro para quem já o tinha; melhorias para operação gestora.
insert into public.crm_feature_role_flags (flag_key, role, enabled)
select f.flag_key, r.role,
  case f.flag_key
    when 'feat.export_audit_csv' then r.role = any (array['admin','gestor']::text[])
    when 'feat.financial_panel' then r.role = any (array['admin','gestor','financeiro']::text[])
    when 'feat.experimental_improvements' then r.role = any (array['admin','gestor']::text[])
    else false
  end
from (select unnest(array['admin','gestor','cadastro','compras','estoque','recebimento','oficina','financeiro','consulta']::text[]) as role) r
cross join (select unnest(array['feat.export_audit_csv','feat.financial_panel','feat.experimental_improvements']::text[]) as flag_key) f
on conflict (flag_key, role) do nothing;
