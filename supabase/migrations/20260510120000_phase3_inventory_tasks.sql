-- Fase 3 — Estoque gerencial (PRD §12) + tarefas (PRD §16) + métrica % padrão novo.
-- Pré-requisito: products, profiles, alerts, touch_updated_at, log_row_audit.

-- ---------------------------------------------------------------------------
-- Tipos e localizações de estoque
-- ---------------------------------------------------------------------------

create table if not exists public.stock_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stock_types_code_key unique (code)
);

insert into public.stock_types (code, name, sort_order)
values
  ('VENDA', 'Venda', 10),
  ('OFICINA', 'Oficina', 20),
  ('AVARIADO', 'Avariado', 30),
  ('GARANTIA', 'Garantia', 40),
  ('RESERVADO', 'Reservado', 50),
  ('EM_TRANSITO', 'Em trânsito', 60),
  ('BRINDE', 'Brinde', 70),
  ('CONSIGNADO', 'Consignado', 80)
on conflict (code) do nothing;

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_locations_code_key unique (code)
);

insert into public.stock_locations (code, name, description)
values ('GRL-001', 'Depósito geral', 'Local padrão para saldo inicial antes de endereçamento fino.')
on conflict (code) do nothing;

drop trigger if exists tr_touch_updated_at on public.stock_locations;
create trigger tr_touch_updated_at
  before update on public.stock_locations
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Saldos e movimentos
-- ---------------------------------------------------------------------------

create table if not exists public.product_stock_balances (
  product_id uuid not null references public.products (id) on delete cascade,
  stock_type_id uuid not null references public.stock_types (id) on delete restrict,
  stock_location_id uuid not null references public.stock_locations (id) on delete restrict,
  quantity numeric not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, stock_type_id, stock_location_id)
);

create index if not exists product_stock_balances_product_idx on public.product_stock_balances (product_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  stock_type_id uuid not null references public.stock_types (id) on delete restrict,
  stock_location_id uuid not null references public.stock_locations (id) on delete restrict,
  delta_qty numeric not null,
  balance_after numeric not null,
  movement_kind text not null default 'adjustment'
    check (movement_kind in ('initial', 'adjustment', 'transfer')),
  justification text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tarefas (PRD §16)
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  origin text not null default 'manual',
  module text,
  entity_type text,
  entity_id uuid,
  source_key text,
  responsible_user_id uuid not null references public.profiles (id) on delete restrict,
  due_date timestamptz not null,
  priority text not null default 'media'
    check (priority in ('critica', 'alta', 'media', 'baixa')),
  status text not null default 'aberta'
    check (status in ('aberta', 'em_andamento', 'aguardando_terceiro', 'concluida', 'atrasada', 'cancelada')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id) on delete set null
);

create index if not exists tasks_responsible_idx on public.tasks (responsible_user_id, status);
create index if not exists tasks_due_idx on public.tasks (due_date);
create index if not exists tasks_entity_idx on public.tasks (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- RPC: ajuste de saldo com justificativa (transação atómica)
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_inventory()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and p.role in ('admin', 'gestor', 'estoque')
  );
$$;

create or replace function public.stock_apply_movement(
  p_product_id uuid,
  p_stock_type_id uuid,
  p_stock_location_id uuid,
  p_delta numeric,
  p_justification text,
  p_kind text default 'adjustment'
)
returns numeric
language plpgsql
security invoker
set search_path to public
as $$
declare
  v_old numeric;
  v_new numeric;
begin
  if p_justification is null or btrim(p_justification) = '' then
    raise exception 'Justificativa obrigatória para movimentação de estoque';
  end if;
  if not public.can_manage_inventory() then
    raise exception 'Sem permissão para movimentar estoque';
  end if;
  if p_kind not in ('initial', 'adjustment', 'transfer') then
    raise exception 'Tipo de movimento inválido';
  end if;

  insert into public.product_stock_balances (product_id, stock_type_id, stock_location_id, quantity)
  values (p_product_id, p_stock_type_id, p_stock_location_id, 0)
  on conflict (product_id, stock_type_id, stock_location_id) do nothing;

  select b.quantity into v_old
  from public.product_stock_balances b
  where b.product_id = p_product_id
    and b.stock_type_id = p_stock_type_id
    and b.stock_location_id = p_stock_location_id
  for update;

  v_new := coalesce(v_old, 0) + p_delta;
  if v_new < 0 then
    raise exception 'Saldo gerencial não pode ficar negativo';
  end if;

  update public.product_stock_balances
  set quantity = v_new, updated_at = now()
  where product_id = p_product_id
    and stock_type_id = p_stock_type_id
    and stock_location_id = p_stock_location_id;

  insert into public.stock_movements (
    product_id, stock_type_id, stock_location_id, delta_qty, balance_after, movement_kind, justification, created_by
  ) values (
    p_product_id, p_stock_type_id, p_stock_location_id, p_delta, v_new, p_kind, btrim(p_justification), auth.uid()
  );

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Métrica Painel da Casa: % produtos ativos no padrão novo
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_new_standard_pct()
returns numeric
language sql
stable
security definer
set search_path to public
as $$
  select case
    when count(*) filter (where p.is_active) = 0 then 0::numeric
    else round(
      100.0 * count(*) filter (where p.is_active and p.is_new_standard)
      / nullif(count(*) filter (where p.is_active), 0)::numeric,
      1
    )
  end
  from public.products p;
$$;

-- ---------------------------------------------------------------------------
-- Tarefas automáticas: pendência "sem localização" no cadastro
-- ---------------------------------------------------------------------------

create or replace function public.sync_tasks_from_product_pendencies()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  v_resp uuid;
  v_title text;
begin
  v_resp := coalesce(
    new.responsible_user_id,
    (select p.id from public.profiles p where p.is_active and p.role = 'estoque' order by p.created_at limit 1),
    (select p.id from public.profiles p where p.is_active and p.role = 'gestor' order by p.created_at limit 1),
    (select p.id from public.profiles p where p.is_active order by p.created_at limit 1)
  );

  if v_resp is null then
    return new;
  end if;

  if new.pendencies @> array['sem localização']::text[] then
    if not exists (
      select 1 from public.tasks t
      where t.entity_type = 'products'
        and t.entity_id = new.id
        and t.source_key = 'product_sem_localizacao'
        and t.status not in ('concluida', 'cancelada')
    ) then
      v_title := 'Definir localização física: ' || left(btrim(new.description), 120);
      insert into public.tasks (
        title, description, origin, module, entity_type, entity_id, source_key,
        responsible_user_id, due_date, priority, status, created_by
      )
      values (
        v_title,
        'Gerado automaticamente: produto sem localização no cadastro mestre (PRD §16).',
        'cadastro_mestre',
        'cadastro_mestre',
        'products',
        new.id,
        'product_sem_localizacao',
        v_resp,
        now() + interval '7 days',
        'alta',
        'aberta',
        auth.uid()
      );
    end if;
  else
    update public.tasks
    set status = 'concluida', completed_at = coalesce(completed_at, now())
    where entity_type = 'products'
      and entity_id = new.id
      and source_key = 'product_sem_localizacao'
      and status not in ('concluida', 'cancelada');
  end if;

  return new;
end;
$$;

drop trigger if exists tr_products_sync_tasks on public.products;
create trigger tr_products_sync_tasks
  after insert or update of pendencies, default_location, description, responsible_user_id on public.products
  for each row
  execute function public.sync_tasks_from_product_pendencies();

-- ---------------------------------------------------------------------------
-- Alerta: saldo tipo VENDA abaixo do mínimo do produto
-- ---------------------------------------------------------------------------

create or replace function public.sync_alert_stock_below_min()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  v_min numeric;
  v_sum numeric;
  v_type uuid;
  v_abc text;
  v_prio text;
  v_title text;
begin
  select st.id into v_type from public.stock_types st where st.code = 'VENDA' limit 1;
  if v_type is null or new.stock_type_id is distinct from v_type then
    return new;
  end if;

  select p.min_stock, p.abc_class
  into v_min, v_abc
  from public.products p
  where p.id = new.product_id;

  if v_min is null then
    return new;
  end if;

  select coalesce(sum(b.quantity), 0) into v_sum
  from public.product_stock_balances b
  where b.product_id = new.product_id and b.stock_type_id = v_type;

  v_prio := case when v_abc = 'A' then 'critica' else 'alta' end;
  v_title := 'Estoque gerencial abaixo do mínimo';

  if v_sum < v_min then
    if not exists (
      select 1 from public.alerts a
      where a.entity_type = 'products'
        and a.entity_id = new.product_id::text
        and a.type = 'estoque_abaixo_minimo'
        and a.resolved_at is null
    ) then
      insert into public.alerts (
        title, type, origin, priority, reason, status, entity_type, entity_id, responsible_user_id, due_date, impact
      )
      values (
        v_title,
        'estoque_abaixo_minimo',
        'inventory',
        v_prio,
        format('Saldo VENDA %.4f inferior ao mínimo %.4f.', v_sum, v_min),
        'aberta',
        'products',
        new.product_id::text,
        (select p.responsible_user_id from public.products p where p.id = new.product_id),
        (now() + interval '3 days')::timestamptz,
        case when v_abc = 'A' then 'critico' else 'medio' end
      );
    end if;
  else
    update public.alerts
    set resolved_at = coalesce(resolved_at, now())
    where entity_type = 'products'
      and entity_id = new.product_id::text
      and type = 'estoque_abaixo_minimo'
      and resolved_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_stock_balance_alert on public.product_stock_balances;
create trigger tr_stock_balance_alert
  after insert or update of quantity on public.product_stock_balances
  for each row
  execute function public.sync_alert_stock_below_min();

-- ---------------------------------------------------------------------------
-- Auditoria (stock_locations já tem touch; restantes)
-- ---------------------------------------------------------------------------

drop trigger if exists tr_audit_row on public.stock_locations;
create trigger tr_audit_row
  after insert or update or delete on public.stock_locations
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.tasks;
create trigger tr_audit_row
  after insert or update or delete on public.tasks
  for each row
  execute function public.log_row_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_tasks_broad()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and p.role in ('admin', 'gestor', 'cadastro', 'compras', 'estoque', 'oficina', 'recebimento')
  );
$$;

alter table public.stock_types enable row level security;
alter table public.stock_locations enable row level security;
alter table public.product_stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.tasks enable row level security;

-- stock_types: leitura para autenticados ativos
drop policy if exists stock_types_select on public.stock_types;
create policy stock_types_select
  on public.stock_types for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

-- stock_locations
drop policy if exists stock_locations_select on public.stock_locations;
create policy stock_locations_select
  on public.stock_locations for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists stock_locations_write on public.stock_locations;
create policy stock_locations_write
  on public.stock_locations for all to authenticated
  using ((select public.can_manage_inventory()))
  with check ((select public.can_manage_inventory()));

-- balances: leitura ampla; escrita via RPC (função invoker) — permitir update direto a equipa estoque
drop policy if exists stock_balances_select on public.product_stock_balances;
create policy stock_balances_select
  on public.product_stock_balances for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists stock_balances_write on public.product_stock_balances;
create policy stock_balances_write
  on public.product_stock_balances for all to authenticated
  using ((select public.can_manage_inventory()))
  with check ((select public.can_manage_inventory()));

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select
  on public.stock_movements for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists stock_movements_insert on public.stock_movements;
create policy stock_movements_insert
  on public.stock_movements for insert to authenticated
  with check ((select public.can_manage_inventory()));

-- tasks
drop policy if exists tasks_select on public.tasks;
create policy tasks_select
  on public.tasks for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert
  on public.tasks for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update
  on public.tasks for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
    and (
      responsible_user_id = auth.uid()
      or (select public.is_admin_or_gestor())
    )
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete
  on public.tasks for delete to authenticated
  using ((select public.is_admin_or_gestor()));

revoke all on public.stock_types, public.stock_locations, public.product_stock_balances, public.stock_movements, public.tasks from anon;

grant select on public.stock_types to authenticated;
grant select, insert, update, delete on public.stock_locations to authenticated;
grant select, insert, update, delete on public.product_stock_balances to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

grant execute on function public.stock_apply_movement(uuid, uuid, uuid, numeric, text, text) to authenticated;
grant execute on function public.dashboard_new_standard_pct() to authenticated;
grant execute on function public.can_manage_inventory() to authenticated;
