-- Alinha métricas e RPCs ao soft delete de produtos: não contar nem cruzar linhas com deleted_at preenchido.
-- Impede alteração de produto já arquivado (exceto o próprio soft delete já aplicado antes do trigger — ver abaixo).

-- ---------------------------------------------------------------------------
-- Painel da Casa: % padrão novo (denominador só produtos não arquivados)
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
  from public.products p
  where p.deleted_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Alertas de margem mínima (painel gerencial): ignorar cadastro arquivado
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
      (
        (p.erp_code is not null and trim(lower(p.erp_code)) = trim(lower(si.product_code)))
        or trim(lower(p.internal_code)) = trim(lower(si.product_code))
      )
      and p.deleted_at is null
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
-- Commit importação vendas: custo gerencial só de produto activo (não arquivado)
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
      (
        (p.erp_code is not null and trim(lower(p.erp_code)) = trim(lower(r.product_code)))
        or trim(lower(p.internal_code)) = trim(lower(r.product_code))
      )
      and p.deleted_at is null
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
-- Agregação margem / DRE gerencial: cruzar só produtos não arquivados
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
        (
          (pr.erp_code is not null and trim(lower(pr.erp_code)) = trim(lower(si.product_code)))
          or trim(lower(pr.internal_code)) = trim(lower(si.product_code))
        )
        and pr.deleted_at is null
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
      (
        (pr.erp_code is not null and trim(lower(pr.erp_code)) = trim(lower(si.product_code)))
        or trim(lower(pr.internal_code)) = trim(lower(si.product_code))
      )
      and pr.deleted_at is null
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
      (
        (pr.erp_code is not null and trim(lower(pr.erp_code)) = trim(lower(si.product_code)))
        or trim(lower(pr.internal_code)) = trim(lower(si.product_code))
      )
      and pr.deleted_at is null
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
            (
              (pr2.erp_code is not null and trim(lower(pr2.erp_code)) = trim(lower(si2.product_code)))
              or trim(lower(pr2.internal_code)) = trim(lower(si2.product_code))
            )
            and pr2.deleted_at is null
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
-- Estoque: não movimentar produto arquivado
-- ---------------------------------------------------------------------------

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

  if not exists (
    select 1 from public.products pr
    where pr.id = p_product_id and pr.deleted_at is null
  ) then
    raise exception 'Produto não encontrado ou arquivado';
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
-- Compras: sugestões automáticas ignoram produtos arquivados
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
      and p.deleted_at is null
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
-- Alerta estoque mínimo: não gerir produto arquivado
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
  where p.id = new.product_id
    and p.deleted_at is null;

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
        (select p.responsible_user_id from public.products p where p.id = new.product_id and p.deleted_at is null),
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

-- ---------------------------------------------------------------------------
-- Cadastro mestre: bloquear UPDATE após arquivamento
-- ---------------------------------------------------------------------------

create or replace function public.trg_products_block_update_when_deleted()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if old.deleted_at is not null then
    raise exception 'Produto arquivado não pode ser alterado';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_products_block_update_when_deleted on public.products;
create trigger tr_products_block_update_when_deleted
  before update on public.products
  for each row
  execute function public.trg_products_block_update_when_deleted();
