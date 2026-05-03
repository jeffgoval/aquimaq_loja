-- Fase 9 — Painel gerencial económico: staging de importação CSV, commit para erp_sales/items,
-- agregações de margem, DRE gerencial básica e alertas de margem mínima.

-- ---------------------------------------------------------------------------
-- Permissão painel gerencial (admin, gestor, financeiro)
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_management_panel()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select public.has_role(array['admin', 'gestor', 'financeiro']::text[]);
$$;

-- ---------------------------------------------------------------------------
-- Staging CSV → erp_sales / erp_sale_items (commit via RPC)
-- ---------------------------------------------------------------------------

create table if not exists public.management_sales_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'committed', 'failed')),
  source_filename text,
  row_count int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  committed_at timestamptz
);

create table if not exists public.management_sales_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.management_sales_import_batches (id) on delete cascade,
  row_no int not null,
  sale_code text not null,
  sale_date date not null,
  seller_name text,
  customer_code text,
  channel text,
  payment_type text,
  is_cancelled boolean not null default false,
  product_code text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null,
  unit_cost numeric,
  discount numeric,
  line_total numeric,
  created_at timestamptz not null default now()
);

create index if not exists management_sales_import_rows_batch_idx
  on public.management_sales_import_rows (batch_id);

create index if not exists management_sales_import_batches_created_idx
  on public.management_sales_import_batches (created_at desc);

-- ---------------------------------------------------------------------------
-- Alertas: alargar enums para linha de venda e origem do painel (antes dos inserts)
-- ---------------------------------------------------------------------------

alter table public.alerts drop constraint if exists alerts_entity_type_check;
alter table public.alerts
  add constraint alerts_entity_type_check check (
    entity_type = any (array[
      'product'::text,
      'customer'::text,
      'sale'::text,
      'work_order'::text,
      'task'::text,
      'erp_sale_item'::text
    ])
  );

alter table public.alerts drop constraint if exists alerts_origin_check;
alter table public.alerts
  add constraint alerts_origin_check check (
    origin = any (array['system'::text, 'manual'::text, 'management_panel'::text])
  );

-- ---------------------------------------------------------------------------
-- Alertas: linha com margem % abaixo da margem mínima do cadastro (definir antes do commit)
-- ---------------------------------------------------------------------------

create or replace function public.management_sync_margin_alerts(p_start date, p_end date)
returns integer
language plpgsql
security definer
set search_path to public
as $$
declare
  n int := 0;
begin
  if auth.uid() is not null and not public.can_manage_management_panel() then
    raise exception 'Sem permissão';
  end if;

  insert into public.alerts (
    type,
    priority,
    title,
    reason,
    impact,
    origin,
    entity_type,
    entity_id,
    status,
    suggested_action
  )
  select
    'low_margin',
    'high',
    'Venda abaixo da margem mínima',
    format(
      'Produto %s na venda %s: margem efectiva %s%% vs mínimo %s%%.',
      si.product_code,
      si.sale_code,
      round(
        case
          when coalesce(nullif(coalesce(si.total_amount, si.quantity * si.unit_price), 0), 0) = 0 then 0::numeric
          else (
            (coalesce(si.unit_price, 0) - coalesce(si.unit_cost, 0)) * si.quantity
            / nullif(coalesce(si.total_amount, si.quantity * si.unit_price), 0)
          ) * 100
        end,
        2
      )::text,
      round(coalesce(p.margin_minimum_pct, 0), 2)::text
    ),
    'high',
    'management_panel',
    'erp_sale_item',
    si.id,
    'open',
    'Rever preço/custo ou política comercial do SKU.'
  from public.erp_sale_items si
  inner join public.erp_sales s on s.erp_code = si.sale_code
  left join public.products p
    on (
      (p.erp_code is not null and trim(lower(p.erp_code)) = trim(lower(si.product_code)))
      or trim(lower(p.internal_code)) = trim(lower(si.product_code))
    )
  where not s.is_cancelled
    and s.sale_date >= p_start
    and s.sale_date <= p_end
    and p.margin_minimum_pct is not null
    and p.margin_minimum_pct > 0
    and coalesce(nullif(coalesce(si.total_amount, si.quantity * si.unit_price), 0), 0) > 0
    and (
      (
        (coalesce(si.unit_price, 0) - coalesce(si.unit_cost, 0)) * si.quantity
        / nullif(coalesce(si.total_amount, si.quantity * si.unit_price), 0)
      ) * 100
    ) < p.margin_minimum_pct
    and not exists (
      select 1 from public.alerts a
      where a.entity_type = 'erp_sale_item'
        and a.entity_id = si.id
        and a.type = 'low_margin'
        and a.resolved_at is null
    );

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Commit: upsert cabeçalhos, substituir linhas das vendas do lote, custo a partir do produto
-- ---------------------------------------------------------------------------

create or replace function public.management_commit_sales_import(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean;
  v_min_d date;
  v_max_d date;
  v_cnt int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select
    (b.created_by = v_uid or public.is_admin_or_gestor())
    and b.status = 'draft'
    and public.can_manage_management_panel()
  into v_ok
  from public.management_sales_import_batches b
  where b.id = p_batch_id;

  if not coalesce(v_ok, false) then
    raise exception 'Lote inválido ou sem permissão';
  end if;

  select min(r.sale_date), max(r.sale_date), count(*)::int
  into v_min_d, v_max_d, v_cnt
  from public.management_sales_import_rows r
  where r.batch_id = p_batch_id;

  if v_cnt = 0 then
    update public.management_sales_import_batches
    set status = 'failed', error_message = 'Sem linhas no lote.'
    where id = p_batch_id;
    return jsonb_build_object('ok', false, 'error', 'empty batch');
  end if;

  insert into public.erp_sales (
    erp_code,
    sale_date,
    seller_name,
    customer_code,
    channel,
    payment_type,
    discount,
    is_cancelled,
    imported_at,
    total_amount
  )
  select
    x.sale_code,
    x.sale_date,
    x.seller_name,
    x.customer_code,
    x.channel,
    x.payment_type,
    x.discount,
    x.is_cancelled,
    now(),
    x.total_amount
  from (
    select
      r.sale_code,
      min(r.sale_date) as sale_date,
      (array_agg(nullif(trim(r.seller_name), '')) filter (where nullif(trim(r.seller_name), '') is not null))[1] as seller_name,
      (array_agg(nullif(trim(r.customer_code), '')) filter (where nullif(trim(r.customer_code), '') is not null))[1] as customer_code,
      (array_agg(nullif(trim(r.channel), '')) filter (where nullif(trim(r.channel), '') is not null))[1] as channel,
      (array_agg(nullif(trim(r.payment_type), '')) filter (where nullif(trim(r.payment_type), '') is not null))[1] as payment_type,
      coalesce(sum(coalesce(r.discount, 0)), 0)::numeric as discount,
      bool_or(r.is_cancelled) as is_cancelled,
      coalesce(sum(coalesce(r.line_total, r.quantity * r.unit_price, 0)), 0)::numeric as total_amount
    from public.management_sales_import_rows r
    where r.batch_id = p_batch_id
    group by r.sale_code
  ) x
  on conflict (erp_code) do update set
    sale_date = excluded.sale_date,
    seller_name = excluded.seller_name,
    customer_code = excluded.customer_code,
    channel = excluded.channel,
    payment_type = excluded.payment_type,
    discount = excluded.discount,
    is_cancelled = excluded.is_cancelled,
    imported_at = excluded.imported_at,
    total_amount = excluded.total_amount;

  delete from public.erp_sale_items si
  where si.sale_code in (
    select distinct r.sale_code
    from public.management_sales_import_rows r
    where r.batch_id = p_batch_id
  );

  insert into public.erp_sale_items (
    sale_code,
    product_code,
    quantity,
    unit_price,
    unit_cost,
    discount,
    total_amount,
    imported_at
  )
  select
    r.sale_code,
    trim(r.product_code),
    r.quantity,
    r.unit_price,
    coalesce(
      r.unit_cost,
      p.management_cost,
      0::numeric
    ) as unit_cost,
    coalesce(r.discount, 0),
    coalesce(r.line_total, r.quantity * r.unit_price),
    now()
  from public.management_sales_import_rows r
  left join public.products p
    on (
      (p.erp_code is not null and trim(lower(p.erp_code)) = trim(lower(r.product_code)))
      or trim(lower(p.internal_code)) = trim(lower(r.product_code))
    )
  where r.batch_id = p_batch_id;

  update public.management_sales_import_batches
  set status = 'committed', committed_at = now(), error_message = null
  where id = p_batch_id;

  perform public.management_sync_margin_alerts(v_min_d, v_max_d);

  return jsonb_build_object(
    'ok', true,
    'sale_lines', v_cnt,
    'period_start', v_min_d,
    'period_end', v_max_d
  );
exception
  when others then
    update public.management_sales_import_batches
    set status = 'failed', error_message = left(sqlerrm, 2000)
    where id = p_batch_id;
    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- Agregação de margem por dimensão
-- ---------------------------------------------------------------------------

create or replace function public.management_margin_breakdown(
  p_start date,
  p_end date,
  p_dimension text
)
returns table (
  dimension_key text,
  dimension_label text,
  revenue numeric,
  margin_value numeric,
  qty numeric,
  line_count bigint
)
language plpgsql
stable
security definer
set search_path to public
as $$
begin
  if not public.can_manage_management_panel() then
    raise exception 'Sem permissão';
  end if;

  if p_dimension not in ('result_center', 'product', 'seller') then
    raise exception 'Dimensão inválida';
  end if;

  return query
  with base as (
    select
      si.id,
      si.product_code,
      si.quantity,
      coalesce(si.total_amount, si.quantity * si.unit_price, 0)::numeric as revenue_line,
      ((coalesce(si.unit_price, 0) - coalesce(si.unit_cost, 0)) * si.quantity)::numeric as margin_line,
      s.seller_name,
      pr.id as product_id,
      pr.description as product_desc,
      rc.id as rc_id,
      rc.name as rc_name
    from public.erp_sale_items si
    inner join public.erp_sales s on s.erp_code = si.sale_code
    left join public.products pr
      on (
        (pr.erp_code is not null and trim(lower(pr.erp_code)) = trim(lower(si.product_code)))
        or trim(lower(pr.internal_code)) = trim(lower(si.product_code))
      )
    left join public.result_centers rc on rc.id = pr.result_center_id
    where not s.is_cancelled
      and s.sale_date >= p_start
      and s.sale_date <= p_end
  )
  select
    case p_dimension
      when 'result_center' then coalesce(b.rc_id::text, '_sem_centro')
      when 'product' then coalesce(b.product_id::text, b.product_code)
      when 'seller' then coalesce(nullif(trim(b.seller_name), ''), '_sem_vendedor')
      else '_'
    end::text as dimension_key,
    case p_dimension
      when 'result_center' then coalesce(b.rc_name, 'Sem centro')
      when 'product' then coalesce(b.product_desc, b.product_code)
      when 'seller' then coalesce(nullif(trim(b.seller_name), ''), 'Sem vendedor')
      else '?'
    end::text as dimension_label,
    sum(b.revenue_line)::numeric(18, 2) as revenue,
    sum(b.margin_line)::numeric(18, 2) as margin_value,
    sum(b.quantity)::numeric(18, 4) as qty,
    count(*)::bigint as line_count
  from base b
  group by 1, 2
  order by sum(b.revenue_line) desc nulls last;
end;
$$;

-- ---------------------------------------------------------------------------
-- DRE gerencial básica
-- ---------------------------------------------------------------------------

create or replace function public.management_dre_basic(
  p_start date,
  p_end date,
  p_result_center_id uuid default null
)
returns table (
  sort_order int,
  code text,
  label text,
  amount numeric
)
language plpgsql
stable
security definer
set search_path to public
as $$
declare
  v_rec numeric;
  v_cmv numeric;
  v_disc numeric;
begin
  if not public.can_manage_management_panel() then
    raise exception 'Sem permissão';
  end if;

  select coalesce(sum(coalesce(si.total_amount, si.quantity * si.unit_price, 0)), 0)::numeric(18, 2)
  into v_rec
  from public.erp_sale_items si
  inner join public.erp_sales s on s.erp_code = si.sale_code
  left join public.products pr
    on (
      (pr.erp_code is not null and trim(lower(pr.erp_code)) = trim(lower(si.product_code)))
      or trim(lower(pr.internal_code)) = trim(lower(si.product_code))
    )
  where not s.is_cancelled
    and s.sale_date >= p_start
    and s.sale_date <= p_end
    and (
      p_result_center_id is null
      or pr.result_center_id = p_result_center_id
    );

  select coalesce(sum(coalesce(si.unit_cost, 0) * si.quantity), 0)::numeric(18, 2)
  into v_cmv
  from public.erp_sale_items si
  inner join public.erp_sales s on s.erp_code = si.sale_code
  left join public.products pr
    on (
      (pr.erp_code is not null and trim(lower(pr.erp_code)) = trim(lower(si.product_code)))
      or trim(lower(pr.internal_code)) = trim(lower(si.product_code))
    )
  where not s.is_cancelled
    and s.sale_date >= p_start
    and s.sale_date <= p_end
    and (
      p_result_center_id is null
      or pr.result_center_id = p_result_center_id
    );

  select coalesce(sum(s.discount), 0)::numeric(18, 2)
  into v_disc
  from public.erp_sales s
  where not s.is_cancelled
    and s.sale_date >= p_start
    and s.sale_date <= p_end
    and (
      p_result_center_id is null
      or exists (
        select 1
        from public.erp_sale_items si2
        left join public.products pr2
          on (
            (pr2.erp_code is not null and trim(lower(pr2.erp_code)) = trim(lower(si2.product_code)))
            or trim(lower(pr2.internal_code)) = trim(lower(si2.product_code))
          )
        where si2.sale_code = s.erp_code
          and pr2.result_center_id = p_result_center_id
      )
    );

  return query
  select * from (
    select 1, 'receita_bruta'::text, 'Receita bruta (itens)'::text, v_rec
    union all
    select 2, 'cmv'::text, 'CMV (custo × quantidade)'::text, v_cmv
    union all
    select 3, 'margem_bruta'::text, 'Margem bruta'::text, (v_rec - v_cmv)
    union all
    select 4, 'descontos_nf'::text, 'Descontos (cabeçalho venda)'::text, v_disc
  ) t (sort_order, code, label, amount)
  order by sort_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers / RLS
-- ---------------------------------------------------------------------------

drop trigger if exists tr_touch_updated_at on public.management_sales_import_batches;
create trigger tr_touch_updated_at
  before update on public.management_sales_import_batches
  for each row
  execute function public.touch_updated_at();

alter table public.management_sales_import_batches enable row level security;
alter table public.management_sales_import_rows enable row level security;

drop policy if exists msib_select on public.management_sales_import_batches;
create policy msib_select
  on public.management_sales_import_batches for select to authenticated
  using (
    public.can_manage_management_panel()
    and (created_by = auth.uid() or public.is_admin_or_gestor())
  );

drop policy if exists msib_insert on public.management_sales_import_batches;
create policy msib_insert
  on public.management_sales_import_batches for insert to authenticated
  with check (
    public.can_manage_management_panel()
    and created_by = auth.uid()
  );

drop policy if exists msib_update on public.management_sales_import_batches;
create policy msib_update
  on public.management_sales_import_batches for update to authenticated
  using (
    public.can_manage_management_panel()
    and (created_by = auth.uid() or public.is_admin_or_gestor())
  )
  with check (
    public.can_manage_management_panel()
    and (created_by = auth.uid() or public.is_admin_or_gestor())
  );

drop policy if exists msir_all on public.management_sales_import_rows;
create policy msir_all
  on public.management_sales_import_rows for all to authenticated
  using (
    exists (
      select 1
      from public.management_sales_import_batches b
      where b.id = batch_id
        and public.can_manage_management_panel()
        and (b.created_by = auth.uid() or public.is_admin_or_gestor())
    )
  )
  with check (
    exists (
      select 1
      from public.management_sales_import_batches b
      where b.id = batch_id
        and public.can_manage_management_panel()
        and (b.created_by = auth.uid() or public.is_admin_or_gestor())
    )
  );

revoke all on public.management_sales_import_batches, public.management_sales_import_rows from anon;

grant select, insert, update, delete on public.management_sales_import_batches to authenticated;
grant select, insert, update, delete on public.management_sales_import_rows to authenticated;

grant execute on function public.can_manage_management_panel() to authenticated;
grant execute on function public.management_commit_sales_import(uuid) to authenticated;
grant execute on function public.management_sync_margin_alerts(date, date) to authenticated;
grant execute on function public.management_margin_breakdown(date, date, text) to authenticated;
grant execute on function public.management_dre_basic(date, date, uuid) to authenticated;

revoke execute on function public.can_manage_management_panel() from public;
revoke execute on function public.management_commit_sales_import(uuid) from public;
revoke execute on function public.management_sync_margin_alerts(date, date) from public;
revoke execute on function public.management_margin_breakdown(date, date, text) from public;
revoke execute on function public.management_dre_basic(date, date, uuid) from public;

grant execute on function public.can_manage_management_panel() to service_role;
grant execute on function public.management_commit_sales_import(uuid) to service_role;
grant execute on function public.management_sync_margin_alerts(date, date) to service_role;
grant execute on function public.management_margin_breakdown(date, date, text) to service_role;
grant execute on function public.management_dre_basic(date, date, uuid) to service_role;
