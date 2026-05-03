-- Fase 6 — Recebimento gerencial (PRD §14): checklist, divergência→tarefa, custo alterado→revisão de preço, liberação VENDA.
-- Pré-requisito: suppliers, profiles, purchase_suggestions, products, stock_locations, stock_types,
--   product_stock_balances, stock_movements, tasks, touch_updated_at, log_row_audit.

-- ---------------------------------------------------------------------------
-- Tabelas recebimento
-- ---------------------------------------------------------------------------

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  purchase_suggestion_id uuid references public.purchase_suggestions (id) on delete set null,
  invoice_ref text,
  arrived_at timestamptz not null default now(),
  responsible_user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'aguardando_conferencia'
    check (status in (
      'aguardando_conferencia',
      'em_conferencia',
      'com_divergencia',
      'aguardando_localizacao',
      'liberado_venda',
      'cancelado'
    )),
  chk_supplier boolean not null default false,
  chk_invoice boolean not null default false,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipts_status_idx on public.receipts (status);
create index if not exists receipts_supplier_idx on public.receipts (supplier_id);
create index if not exists receipts_created_idx on public.receipts (created_at desc);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  expected_qty numeric,
  received_qty numeric not null default 0 check (received_qty >= 0),
  unit_cost_expected numeric,
  unit_cost_received numeric not null default 0 check (unit_cost_received >= 0),
  batch_code text,
  expiry_date date,
  damage_notes text,
  divergence_notes text,
  divergence_resolved boolean not null default false,
  chk_product boolean not null default false,
  chk_qty boolean not null default false,
  chk_unit boolean not null default false,
  chk_cost boolean not null default false,
  chk_batch_expiry boolean not null default false,
  chk_damage boolean not null default false,
  chk_divergence boolean not null default false,
  chk_location boolean not null default false,
  stock_location_id uuid references public.stock_locations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipt_items_receipt_idx on public.receipt_items (receipt_id);
create index if not exists receipt_items_product_idx on public.receipt_items (product_id);

drop trigger if exists tr_touch_updated_at on public.receipts;
create trigger tr_touch_updated_at
  before update on public.receipts
  for each row
  execute function public.touch_updated_at();

drop trigger if exists tr_touch_updated_at on public.receipt_items;
create trigger tr_touch_updated_at
  before update on public.receipt_items
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Permissões recebimento
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_receiving()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and p.role in ('admin', 'gestor', 'recebimento')
  );
$$;

-- ---------------------------------------------------------------------------
-- Tarefas: divergência e revisão de preço (custo recebido ≠ esperado)
-- ---------------------------------------------------------------------------

create or replace function public.sync_tasks_from_receipt_items()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  v_rid uuid;
  v_resp_div uuid;
  v_resp_cad uuid;
  v_inv text;
  v_product_label text;
begin
  v_rid := coalesce(new.receipt_id, old.receipt_id);

  select coalesce(r.invoice_ref, ''), r.responsible_user_id
  into v_inv, v_resp_div
  from public.receipts r
  where r.id = v_rid;

  v_resp_div := coalesce(
    v_resp_div,
    (select p.id from public.profiles p where p.is_active and p.role = 'recebimento' order by p.created_at limit 1),
    (select p.id from public.profiles p where p.is_active and p.role = 'gestor' order by p.created_at limit 1),
    (select p.id from public.profiles p where p.is_active order by p.created_at limit 1)
  );

  select p.id into v_resp_cad
  from public.profiles p
  where p.is_active and p.role = 'cadastro'
  order by p.created_at
  limit 1;

  v_resp_cad := coalesce(v_resp_cad, v_resp_div);

  select left(btrim(pr.description), 100)
  into v_product_label
  from public.products pr
  where pr.id = new.product_id;

  if tg_op in ('INSERT', 'UPDATE') then
    if new.divergence_notes is not null and btrim(new.divergence_notes) <> '' and not new.divergence_resolved then
      if not exists (
        select 1 from public.tasks t
        where t.entity_type = 'receipt_items'
          and t.entity_id = new.id
          and t.source_key = 'receipt_item_divergencia'
          and t.status not in ('concluida', 'cancelada')
      ) then
        insert into public.tasks (
          title, description, origin, module, entity_type, entity_id, source_key,
          responsible_user_id, due_date, priority, status, created_by
        )
        values (
          'Divergência no recebimento: ' || coalesce(v_product_label, 'produto'),
          format(
            'Recebimento %s · NF ref.: %s · Detalhe: %s',
            v_rid::text,
            nullif(btrim(v_inv), ''),
            new.divergence_notes
          ),
          'recebimento',
          'recebimento',
          'receipt_items',
          new.id,
          'receipt_item_divergencia',
          v_resp_div,
          (now() + interval '5 days')::timestamptz,
          'alta',
          'aberta',
          auth.uid()
        );
      end if;

      update public.receipts
      set status = 'com_divergencia', updated_at = now()
      where id = v_rid
        and status not in ('liberado_venda', 'cancelado');
    end if;

    if tg_op = 'UPDATE' and new.divergence_resolved and not coalesce(old.divergence_resolved, false) then
      update public.tasks
      set status = 'concluida', completed_at = coalesce(completed_at, now())
      where entity_type = 'receipt_items'
        and entity_id = new.id
        and source_key = 'receipt_item_divergencia'
        and status not in ('concluida', 'cancelada');
    end if;

    if new.unit_cost_expected is not null
      and abs(new.unit_cost_received - new.unit_cost_expected) > 0.01
      and (
        tg_op = 'INSERT'
        or (
          tg_op = 'UPDATE'
          and (
            new.unit_cost_received is distinct from old.unit_cost_received
            or new.unit_cost_expected is distinct from old.unit_cost_expected
          )
        )
      )
    then
      if not exists (
        select 1 from public.tasks t
        where t.entity_type = 'receipt_items'
          and t.entity_id = new.id
          and t.source_key = 'receipt_item_revisao_preco'
          and t.status not in ('concluida', 'cancelada')
      ) then
        insert into public.tasks (
          title, description, origin, module, entity_type, entity_id, source_key,
          responsible_user_id, due_date, priority, status, created_by
        )
        values (
          'Revisão de preço pós-recebimento: ' || coalesce(v_product_label, 'produto'),
          format(
            'Custo esperado %s vs recebido %s (recebimento %s).',
            new.unit_cost_expected::text,
            new.unit_cost_received::text,
            v_rid::text
          ),
          'recebimento',
          'cadastro_mestre',
          'receipt_items',
          new.id,
          'receipt_item_revisao_preco',
          v_resp_cad,
          (now() + interval '10 days')::timestamptz,
          'media',
          'aberta',
          auth.uid()
        );
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_receipt_items_tasks on public.receipt_items;
create trigger tr_receipt_items_tasks
  after insert or update of
    divergence_notes,
    divergence_resolved,
    unit_cost_received,
    unit_cost_expected,
    product_id
  on public.receipt_items
  for each row
  execute function public.sync_tasks_from_receipt_items();

-- ---------------------------------------------------------------------------
-- Liberação: entrada em stock VENDA (SECURITY DEFINER; movimento tipo adjustment)
-- ---------------------------------------------------------------------------

create or replace function public.receipt_release_for_sale(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_sale uuid;
  r record;
  v_inv text;
  v_old numeric;
  v_new numeric;
  v_just text;
begin
  if not public.can_manage_receiving() then
    raise exception 'Sem permissão para libertar recebimento';
  end if;

  select invoice_ref into v_inv from public.receipts where id = p_receipt_id;
  if not found then
    raise exception 'Recebimento não encontrado';
  end if;

  if exists (select 1 from public.receipts r where r.id = p_receipt_id and r.status in ('liberado_venda', 'cancelado')) then
    raise exception 'Recebimento já libertado ou cancelado';
  end if;

  if not exists (
    select 1 from public.receipts r
    where r.id = p_receipt_id and r.chk_supplier and r.chk_invoice
  ) then
    raise exception 'Conclua o checklist do cabeçalho (fornecedor e NF)';
  end if;

  if exists (
    select 1 from public.receipt_items ri
    where ri.receipt_id = p_receipt_id
      and not (
        ri.chk_product and ri.chk_qty and ri.chk_unit and ri.chk_cost
        and ri.chk_batch_expiry and ri.chk_damage and ri.chk_divergence and ri.chk_location
      )
  ) then
    raise exception 'Checklist incompleto em um ou mais itens';
  end if;

  if exists (
    select 1 from public.receipt_items ri
    where ri.receipt_id = p_receipt_id
      and ri.stock_location_id is null
  ) then
    raise exception 'Defina localização de stock em todos os itens';
  end if;

  if exists (
    select 1 from public.receipt_items ri
    where ri.receipt_id = p_receipt_id
      and btrim(coalesce(ri.divergence_notes, '')) <> ''
      and not ri.divergence_resolved
  ) then
    raise exception 'Resolva divergências antes de libertar para venda gerencial';
  end if;

  select st.id into v_sale from public.stock_types st where st.code = 'VENDA' limit 1;
  if v_sale is null then
    raise exception 'Tipo de estoque VENDA não encontrado';
  end if;

  v_just := format(
    'Recebimento %s · NF %s · libertação gerencial',
    p_receipt_id::text,
    coalesce(nullif(btrim(v_inv), ''), 's/ref.')
  );

  for r in
    select * from public.receipt_items where receipt_id = p_receipt_id
  loop
    if r.received_qty <= 0 then
      continue;
    end if;

    insert into public.product_stock_balances (product_id, stock_type_id, stock_location_id, quantity)
    values (r.product_id, v_sale, r.stock_location_id, 0)
    on conflict (product_id, stock_type_id, stock_location_id) do nothing;

    select b.quantity into v_old
    from public.product_stock_balances b
    where b.product_id = r.product_id
      and b.stock_type_id = v_sale
      and b.stock_location_id = r.stock_location_id
    for update;

    v_new := coalesce(v_old, 0) + r.received_qty;
    if v_new < 0 then
      raise exception 'Saldo gerencial não pode ficar negativo';
    end if;

    update public.product_stock_balances
    set quantity = v_new, updated_at = now()
    where product_id = r.product_id
      and stock_type_id = v_sale
      and stock_location_id = r.stock_location_id;

    insert into public.stock_movements (
      product_id, stock_type_id, stock_location_id, delta_qty, balance_after, movement_kind, justification, created_by
    ) values (
      r.product_id, v_sale, r.stock_location_id, r.received_qty, v_new, 'adjustment', v_just, auth.uid()
    );
  end loop;

  update public.receipts
  set status = 'liberado_venda', updated_at = now()
  where id = p_receipt_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

drop trigger if exists tr_audit_row on public.receipts;
create trigger tr_audit_row
  after insert or update or delete on public.receipts
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.receipt_items;
create trigger tr_audit_row
  after insert or update or delete on public.receipt_items
  for each row
  execute function public.log_row_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

drop policy if exists receipts_select on public.receipts;
create policy receipts_select
  on public.receipts for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists receipts_write on public.receipts;
create policy receipts_write
  on public.receipts for all to authenticated
  using ((select public.can_manage_receiving()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_receiving()) or (select public.is_admin_or_gestor()));

drop policy if exists receipt_items_select on public.receipt_items;
create policy receipt_items_select
  on public.receipt_items for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists receipt_items_write on public.receipt_items;
create policy receipt_items_write
  on public.receipt_items for all to authenticated
  using ((select public.can_manage_receiving()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_receiving()) or (select public.is_admin_or_gestor()));

revoke all on public.receipts, public.receipt_items from anon;

grant select, insert, update, delete on public.receipts to authenticated;
grant select, insert, update, delete on public.receipt_items to authenticated;

grant execute on function public.can_manage_receiving() to authenticated;
grant execute on function public.receipt_release_for_sale(uuid) to authenticated;
