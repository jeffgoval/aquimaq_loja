-- Fase 5 — Compras gerenciais (PRD §13): sugestões a partir do mínimo, cotações, aprovação, histórico de custo cotado.
-- Pré-requisito: products, suppliers, profiles, stock_types, product_stock_balances, alerts, touch_updated_at, log_row_audit.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.purchase_suggestions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_suggested numeric not null check (quantity_suggested > 0),
  gerencial_qty_snapshot numeric not null default 0,
  min_stock_snapshot numeric,
  priority text not null default 'media'
    check (priority in ('critica', 'alta', 'media', 'baixa')),
  origin text not null default 'below_min'
    check (origin in ('below_min', 'manual')),
  source_alert_id uuid references public.alerts (id) on delete set null,
  status text not null default 'sugerida'
    check (status in (
      'sugerida',
      'em_analise',
      'em_cotacao',
      'aguardando_aprovacao',
      'aprovada',
      'cancelada'
    )),
  responsible_user_id uuid not null references public.profiles (id) on delete restrict,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz
);

create index if not exists purchase_suggestions_product_idx on public.purchase_suggestions (product_id);
create index if not exists purchase_suggestions_status_idx on public.purchase_suggestions (status);
create index if not exists purchase_suggestions_created_idx on public.purchase_suggestions (created_at desc);

create table if not exists public.purchase_quotes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.purchase_suggestions (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  lead_time_days int check (lead_time_days is null or lead_time_days >= 0),
  payment_terms text,
  notes text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviada', 'selecionada', 'descartada')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_quotes_suggestion_supplier_key unique (suggestion_id, supplier_id)
);

create index if not exists purchase_quotes_suggestion_idx on public.purchase_quotes (suggestion_id);

create table if not exists public.product_quoted_cost_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  unit_price numeric not null check (unit_price >= 0),
  quantity numeric,
  purchase_quote_id uuid references public.purchase_quotes (id) on delete set null,
  purchase_suggestion_id uuid references public.purchase_suggestions (id) on delete set null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null
);

create index if not exists product_quoted_cost_history_product_idx
  on public.product_quoted_cost_history (product_id, recorded_at desc);

drop trigger if exists tr_touch_updated_at on public.purchase_suggestions;
create trigger tr_touch_updated_at
  before update on public.purchase_suggestions
  for each row
  execute function public.touch_updated_at();

drop trigger if exists tr_touch_updated_at on public.purchase_quotes;
create trigger tr_touch_updated_at
  before update on public.purchase_quotes
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Permissões (RLS helpers)
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_purchases()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and p.role in ('admin', 'gestor', 'compras')
  );
$$;

create or replace function public.can_approve_purchases()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and p.role in ('admin', 'gestor')
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: criar sugestões onde saldo VENDA < mínimo (sem sugestão aberta)
-- ---------------------------------------------------------------------------

create or replace function public.purchase_sync_suggestions_from_min_stock()
returns integer
language plpgsql
security definer
set search_path to public
as $$
declare
  v_sale uuid;
  v_inserted int := 0;
  r record;
  v_sum numeric;
  v_qty numeric;
  v_prio text;
  v_alert uuid;
  v_resp uuid;
begin
  if not public.can_manage_purchases() then
    raise exception 'Sem permissão para gerir compras';
  end if;

  select st.id into v_sale from public.stock_types st where st.code = 'VENDA' limit 1;
  if v_sale is null then
    raise exception 'Tipo de estoque VENDA não encontrado';
  end if;

  for r in
    select p.id as pid, p.min_stock, p.abc_class, p.responsible_user_id
    from public.products p
    where p.is_active
      and p.min_stock is not null
      and p.min_stock > 0
  loop
    select coalesce(sum(b.quantity), 0) into v_sum
    from public.product_stock_balances b
    where b.product_id = r.pid
      and b.stock_type_id = v_sale;

    if v_sum >= r.min_stock then
      continue;
    end if;

    if exists (
      select 1 from public.purchase_suggestions ps
      where ps.product_id = r.pid
        and ps.status not in ('aprovada', 'cancelada')
    ) then
      continue;
    end if;

    v_qty := r.min_stock - v_sum;
    if v_qty <= 0 then
      continue;
    end if;

    v_prio := case when r.abc_class = 'A' then 'critica' else 'alta' end;

    select a.id into v_alert
    from public.alerts a
    where a.entity_type = 'products'
      and a.entity_id = r.pid::text
      and a.type = 'estoque_abaixo_minimo'
      and a.resolved_at is null
    order by a.created_at desc
    limit 1;

    v_resp := coalesce(
      r.responsible_user_id,
      (select p2.id from public.profiles p2 where p2.is_active and p2.role = 'compras' order by p2.created_at limit 1),
      (select p2.id from public.profiles p2 where p2.is_active and p2.role = 'gestor' order by p2.created_at limit 1),
      (select p2.id from public.profiles p2 where p2.is_active order by p2.created_at limit 1)
    );

    if v_resp is null then
      continue;
    end if;

    insert into public.purchase_suggestions (
      product_id,
      quantity_suggested,
      gerencial_qty_snapshot,
      min_stock_snapshot,
      priority,
      origin,
      source_alert_id,
      status,
      responsible_user_id,
      notes,
      created_by
    ) values (
      r.pid,
      v_qty,
      v_sum,
      r.min_stock,
      v_prio,
      'below_min',
      v_alert,
      'sugerida',
      v_resp,
      'Gerado automaticamente: saldo gerencial VENDA abaixo do mínimo.',
      auth.uid()
    );

    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: pedir aprovação (equipa compras / gestor)
-- ---------------------------------------------------------------------------

create or replace function public.purchase_suggestion_request_approval(p_suggestion_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not public.can_manage_purchases() then
    raise exception 'Sem permissão para gerir compras';
  end if;

  if not exists (
    select 1 from public.purchase_quotes q
    where q.suggestion_id = p_suggestion_id
      and q.status in ('rascunho', 'enviada')
  ) then
    raise exception 'Registe pelo menos uma cotação antes de pedir aprovação';
  end if;

  update public.purchase_suggestions
  set
    status = 'aguardando_aprovacao',
    updated_at = now()
  where id = p_suggestion_id
    and status in ('sugerida', 'em_analise', 'em_cotacao');

  if not found then
    raise exception 'Sugestão inválida ou estado não permite pedido de aprovação';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: aprovar com cotação vencedora + histórico de custo cotado
-- ---------------------------------------------------------------------------

create or replace function public.purchase_suggestion_approve(p_suggestion_id uuid, p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_product uuid;
  v_supplier uuid;
  v_unit numeric;
  v_qty numeric;
begin
  if not public.can_approve_purchases() then
    raise exception 'Sem permissão para aprovar compras gerenciais';
  end if;

  select s.product_id, q.supplier_id, q.unit_price, q.quantity
  into v_product, v_supplier, v_unit, v_qty
  from public.purchase_quotes q
  join public.purchase_suggestions s on s.id = q.suggestion_id
  where q.id = p_quote_id
    and s.id = p_suggestion_id
    and s.status = 'aguardando_aprovacao'
    and q.status in ('rascunho', 'enviada');

  if v_product is null then
    raise exception 'Cotação ou sugestão inválida para aprovação';
  end if;

  update public.purchase_suggestions
  set
    status = 'aprovada',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  where id = p_suggestion_id;

  update public.purchase_quotes
  set status = 'descartada', updated_at = now()
  where suggestion_id = p_suggestion_id
    and id <> p_quote_id;

  update public.purchase_quotes
  set status = 'selecionada', updated_at = now()
  where id = p_quote_id;

  insert into public.product_quoted_cost_history (
    product_id,
    supplier_id,
    unit_price,
    quantity,
    purchase_quote_id,
    purchase_suggestion_id,
    recorded_by
  ) values (
    v_product,
    v_supplier,
    v_unit,
    v_qty,
    p_quote_id,
    p_suggestion_id,
    auth.uid()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

drop trigger if exists tr_audit_row on public.purchase_suggestions;
create trigger tr_audit_row
  after insert or update or delete on public.purchase_suggestions
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.purchase_quotes;
create trigger tr_audit_row
  after insert or update or delete on public.purchase_quotes
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.product_quoted_cost_history;
create trigger tr_audit_row
  after insert or update or delete on public.product_quoted_cost_history
  for each row
  execute function public.log_row_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.purchase_suggestions enable row level security;
alter table public.purchase_quotes enable row level security;
alter table public.product_quoted_cost_history enable row level security;

drop policy if exists purchase_suggestions_select on public.purchase_suggestions;
create policy purchase_suggestions_select
  on public.purchase_suggestions for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists purchase_suggestions_write on public.purchase_suggestions;
create policy purchase_suggestions_write
  on public.purchase_suggestions for all to authenticated
  using ((select public.can_manage_purchases()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_purchases()) or (select public.is_admin_or_gestor()));

drop policy if exists purchase_quotes_select on public.purchase_quotes;
create policy purchase_quotes_select
  on public.purchase_quotes for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists purchase_quotes_write on public.purchase_quotes;
create policy purchase_quotes_write
  on public.purchase_quotes for all to authenticated
  using ((select public.can_manage_purchases()) or (select public.is_admin_or_gestor()))
  with check ((select public.can_manage_purchases()) or (select public.is_admin_or_gestor()));

drop policy if exists product_quoted_cost_history_select on public.product_quoted_cost_history;
create policy product_quoted_cost_history_select
  on public.product_quoted_cost_history for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

revoke all on public.purchase_suggestions, public.purchase_quotes, public.product_quoted_cost_history from anon;

grant select, insert, update, delete on public.purchase_suggestions to authenticated;
grant select, insert, update, delete on public.purchase_quotes to authenticated;
grant select on public.product_quoted_cost_history to authenticated;

grant execute on function public.can_manage_purchases() to authenticated;
grant execute on function public.can_approve_purchases() to authenticated;
grant execute on function public.purchase_sync_suggestions_from_min_stock() to authenticated;
grant execute on function public.purchase_suggestion_request_approval(uuid) to authenticated;
grant execute on function public.purchase_suggestion_approve(uuid, uuid) to authenticated;
