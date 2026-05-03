-- Fase 7 — Oficina gerencial (PRD §15): OS, peças (stock OFICINA), workflow, alertas OS parada, garantia, fotos (Storage).
-- Pré-requisito: profiles, products, stock_types, stock_locations, product_stock_balances, stock_movements,
--   alerts, tasks, touch_updated_at, log_row_audit.

-- ---------------------------------------------------------------------------
-- Tabelas OS
-- ---------------------------------------------------------------------------

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique default (
    'OS-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  ),
  equipment_label text not null,
  defect_description text,
  diagnosis text,
  technician_id uuid references public.profiles (id) on delete set null,
  responsible_user_id uuid not null references public.profiles (id) on delete restrict,
  customer_name text,
  status text not null default 'aberta'
    check (status in (
      'aberta',
      'em_diagnostico',
      'aguardando_orcamento',
      'aguardando_aprovacao',
      'aguardando_peca',
      'em_execucao',
      'finalizada',
      'entregue',
      'garantia',
      'cancelada'
    )),
  priority text not null default 'media'
    check (priority in ('critica', 'alta', 'media', 'baixa')),
  opened_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_orders_status_idx on public.work_orders (status);
create index if not exists work_orders_activity_idx on public.work_orders (last_activity_at);
create index if not exists work_orders_responsible_idx on public.work_orders (responsible_user_id);

create table if not exists public.work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists work_order_status_history_wo_idx on public.work_order_status_history (work_order_id, changed_at desc);

create table if not exists public.work_order_items (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  stock_location_id uuid not null references public.stock_locations (id) on delete restrict,
  stock_consumed boolean not null default false,
  consumed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists work_order_items_wo_idx on public.work_order_items (work_order_id);

create table if not exists public.work_order_warranties (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  warranty_end_date date,
  notes text not null,
  created_at timestamptz not null default now(),
  constraint work_order_warranties_note_or_date check (
    warranty_end_date is not null or btrim(coalesce(notes, '')) <> ''
  )
);

create index if not exists work_order_warranties_wo_idx on public.work_order_warranties (work_order_id);

create table if not exists public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint work_order_photos_path_key unique (storage_path)
);

create index if not exists work_order_photos_wo_idx on public.work_order_photos (work_order_id);

drop trigger if exists tr_touch_updated_at on public.work_orders;
create trigger tr_touch_updated_at
  before update on public.work_orders
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Permissões oficina
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_workshop()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and p.role in ('admin', 'gestor', 'oficina')
  );
$$;

-- ---------------------------------------------------------------------------
-- Atividade + histórico de estado
-- ---------------------------------------------------------------------------

create or replace function public.work_orders_touch_activity()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if new.status is distinct from old.status
    or new.equipment_label is distinct from old.equipment_label
    or new.defect_description is distinct from old.defect_description
    or new.diagnosis is distinct from old.diagnosis
    or new.technician_id is distinct from old.technician_id
    or new.customer_name is distinct from old.customer_name
    or new.notes is distinct from old.notes
    or new.priority is distinct from old.priority
  then
    new.last_activity_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists tr_work_orders_activity on public.work_orders;
create trigger tr_work_orders_activity
  before update on public.work_orders
  for each row
  execute function public.work_orders_touch_activity();

create or replace function public.work_orders_log_status_change()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.work_order_status_history (
      work_order_id, from_status, to_status, note, changed_by
    ) values (
      new.id, old.status, new.status, null, auth.uid()
    );
    if new.status in ('finalizada', 'entregue', 'cancelada') then
      new.closed_at := coalesce(new.closed_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_work_orders_status on public.work_orders;
create trigger tr_work_orders_status
  before update of status on public.work_orders
  for each row
  execute function public.work_orders_log_status_change();

-- ---------------------------------------------------------------------------
-- Consumo de peça (stock tipo OFICINA)
-- ---------------------------------------------------------------------------

create or replace function public.workshop_consume_part_stock(p_item_id uuid, p_justification text)
returns numeric
language plpgsql
security definer
set search_path to public
as $$
declare
  v_wo uuid;
  v_st uuid;
  v_pid uuid;
  v_loc uuid;
  v_qty numeric;
  v_old numeric;
  v_new numeric;
  v_consumed boolean;
  v_wo_status text;
begin
  if not public.can_manage_workshop() then
    raise exception 'Sem permissão para oficina';
  end if;
  if p_justification is null or btrim(p_justification) = '' then
    raise exception 'Justificativa obrigatória';
  end if;

  select
    i.work_order_id,
    i.product_id,
    i.stock_location_id,
    i.quantity,
    i.stock_consumed,
    w.status
  into v_wo, v_pid, v_loc, v_qty, v_consumed, v_wo_status
  from public.work_order_items i
  join public.work_orders w on w.id = i.work_order_id
  where i.id = p_item_id;

  if v_wo is null then
    raise exception 'Linha de peça não encontrada';
  end if;
  if v_consumed then
    raise exception 'Stock desta peça já foi consumido';
  end if;
  if v_wo_status in ('cancelada', 'entregue') then
    raise exception 'OS não permite consumo neste estado';
  end if;

  select st.id into v_st from public.stock_types st where st.code = 'OFICINA' limit 1;
  if v_st is null then
    raise exception 'Tipo de stock OFICINA não encontrado';
  end if;

  insert into public.product_stock_balances (product_id, stock_type_id, stock_location_id, quantity)
  values (v_pid, v_st, v_loc, 0)
  on conflict (product_id, stock_type_id, stock_location_id) do nothing;

  select b.quantity into v_old
  from public.product_stock_balances b
  where b.product_id = v_pid
    and b.stock_type_id = v_st
    and b.stock_location_id = v_loc
  for update;

  v_new := coalesce(v_old, 0) - v_qty;
  if v_new < 0 then
    raise exception 'Saldo OFICINA insuficiente para esta peça';
  end if;

  update public.product_stock_balances
  set quantity = v_new, updated_at = now()
  where product_id = v_pid
    and stock_type_id = v_st
    and stock_location_id = v_loc;

  insert into public.stock_movements (
    product_id, stock_type_id, stock_location_id, delta_qty, balance_after, movement_kind, justification, created_by
  ) values (
    v_pid, v_st, v_loc, -v_qty, v_new, 'adjustment', btrim(p_justification), auth.uid()
  );

  update public.work_order_items
  set stock_consumed = true, consumed_at = now()
  where id = p_item_id;

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alertas: OS parada (sem atividade há N dias)
-- ---------------------------------------------------------------------------

create or replace function public.workshop_sync_stalled_os_alerts(p_days int default 5)
returns integer
language plpgsql
security definer
set search_path to public
as $$
declare
  v_cnt int := 0;
  r record;
  v_resp uuid;
begin
  if not (public.can_manage_workshop() or public.is_admin_or_gestor()) then
    raise exception 'Sem permissão para sincronizar alertas de oficina';
  end if;
  if p_days < 1 then
    raise exception 'p_days inválido';
  end if;

  for r in
    select w.id, w.internal_code, w.responsible_user_id, w.status
    from public.work_orders w
    where w.status not in ('finalizada', 'entregue', 'cancelada')
      and w.last_activity_at < (now() - (p_days::text || ' days')::interval)
  loop
    v_resp := coalesce(
      r.responsible_user_id,
      (select p.id from public.profiles p where p.is_active and p.role = 'oficina' order by p.created_at limit 1),
      (select p.id from public.profiles p where p.is_active and p.role = 'gestor' order by p.created_at limit 1),
      (select p.id from public.profiles p where p.is_active order by p.created_at limit 1)
    );

    if not exists (
      select 1 from public.alerts a
      where a.entity_type = 'work_orders'
        and a.entity_id = r.id::text
        and a.type = 'os_parada'
        and a.resolved_at is null
    ) then
      insert into public.alerts (
        title, type, origin, priority, reason, status, entity_type, entity_id, responsible_user_id, due_date, impact
      )
      values (
        'OS parada sem atividade',
        'os_parada',
        'workshop',
        'alta',
        format('OS %s em estado %s sem atualização há mais de %s dias.', r.internal_code, r.status, p_days::text),
        'aberta',
        'work_orders',
        r.id::text,
        v_resp,
        (now() + interval '3 days')::timestamptz,
        'medio'
      );
      v_cnt := v_cnt + 1;
    end if;
  end loop;

  update public.alerts a
  set resolved_at = coalesce(a.resolved_at, now())
  where a.type = 'os_parada'
    and a.entity_type = 'work_orders'
    and a.resolved_at is null
    and exists (
      select 1 from public.work_orders w
      where w.id = a.entity_id::uuid
        and (
          w.status in ('finalizada', 'entregue', 'cancelada')
          or w.last_activity_at >= (now() - (p_days::text || ' days')::interval)
        )
    );

  return v_cnt;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: fotos da OS
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('workshop-photos', 'workshop-photos', false)
on conflict (id) do nothing;

drop policy if exists workshop_photos_select on storage.objects;
create policy workshop_photos_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'workshop-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true)
  );

drop policy if exists workshop_photos_insert on storage.objects;
create policy workshop_photos_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workshop-photos'
    and (select public.can_manage_workshop())
  );

drop policy if exists workshop_photos_update on storage.objects;
create policy workshop_photos_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'workshop-photos'
    and (select public.can_manage_workshop())
  )
  with check (bucket_id = 'workshop-photos');

drop policy if exists workshop_photos_delete on storage.objects;
create policy workshop_photos_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'workshop-photos'
    and (select public.can_manage_workshop())
  );

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

drop trigger if exists tr_audit_row on public.work_orders;
create trigger tr_audit_row
  after insert or update or delete on public.work_orders
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.work_order_items;
create trigger tr_audit_row
  after insert or update or delete on public.work_order_items
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.work_order_warranties;
create trigger tr_audit_row
  after insert or update or delete on public.work_order_warranties
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.work_order_photos;
create trigger tr_audit_row
  after insert or update or delete on public.work_order_photos
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.work_order_status_history;
create trigger tr_audit_row
  after insert or update or delete on public.work_order_status_history
  for each row
  execute function public.log_row_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.work_orders enable row level security;
alter table public.work_order_status_history enable row level security;
alter table public.work_order_items enable row level security;
alter table public.work_order_warranties enable row level security;
alter table public.work_order_photos enable row level security;

drop policy if exists work_orders_select on public.work_orders;
create policy work_orders_select
  on public.work_orders for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists work_orders_write on public.work_orders;
create policy work_orders_write
  on public.work_orders for all to authenticated
  using ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()));

drop policy if exists work_order_status_history_select on public.work_order_status_history;
create policy work_order_status_history_select
  on public.work_order_status_history for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists work_order_status_history_insert on public.work_order_status_history;

drop policy if exists work_order_items_select on public.work_order_items;
create policy work_order_items_select
  on public.work_order_items for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists work_order_items_write on public.work_order_items;
create policy work_order_items_write
  on public.work_order_items for all to authenticated
  using ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()));

drop policy if exists work_order_warranties_select on public.work_order_warranties;
create policy work_order_warranties_select
  on public.work_order_warranties for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists work_order_warranties_write on public.work_order_warranties;
create policy work_order_warranties_write
  on public.work_order_warranties for all to authenticated
  using ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()));

drop policy if exists work_order_photos_select on public.work_order_photos;
create policy work_order_photos_select
  on public.work_order_photos for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists work_order_photos_write on public.work_order_photos;
create policy work_order_photos_write
  on public.work_order_photos for all to authenticated
  using ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_workshop()) or (select public.is_admin_or_gestor()));

revoke all on public.work_orders, public.work_order_status_history, public.work_order_items,
  public.work_order_warranties, public.work_order_photos from anon;

grant select, insert, update, delete on public.work_orders to authenticated;
grant select on public.work_order_status_history to authenticated;
grant select, insert, update, delete on public.work_order_items to authenticated;
grant select, insert, update, delete on public.work_order_warranties to authenticated;
grant select, insert, update, delete on public.work_order_photos to authenticated;

grant execute on function public.can_manage_workshop() to authenticated;
grant execute on function public.workshop_consume_part_stock(uuid, text) to authenticated;
grant execute on function public.workshop_sync_stalled_os_alerts(int) to authenticated;
