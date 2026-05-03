-- Fase 2a — Tabelas + função de score + trigger BEFORE (PRD §11).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null,
  erp_product_id uuid unique references public.erp_products (id) on delete set null,
  erp_code text,
  factory_code text,
  barcode text,
  description text not null,
  category_id uuid references public.product_categories (id) on delete restrict,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  primary_supplier_id uuid references public.suppliers (id) on delete set null,
  unit_purchase_id uuid references public.units (id) on delete set null,
  unit_sale_id uuid references public.units (id) on delete set null,
  unit_conversion_factor numeric not null default 1
    check (unit_conversion_factor > 0),
  management_cost numeric,
  management_price numeric,
  margin_minimum_pct numeric,
  margin_target_pct numeric,
  max_discount_pct numeric,
  min_stock numeric,
  max_stock numeric,
  default_location text,
  result_center_id uuid references public.result_centers (id) on delete set null,
  abc_class text check (abc_class is null or abc_class in ('A', 'B', 'C')),
  is_new_standard boolean not null default false,
  responsible_user_id uuid references public.profiles (id) on delete set null,
  last_reviewed_at timestamptz,
  notes text,
  registration_score smallint not null default 0 check (registration_score between 0 and 100),
  pendencies text[] not null default '{}'::text[],
  registration_status text not null default 'incomplete'
    check (registration_status in ('complete', 'incomplete', 'in_review')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_internal_code_key unique (internal_code),
  constraint products_new_standard_requires_full_score check (
    not is_new_standard
    or (
      registration_score = 100
      and category_id is not null
      and unit_purchase_id is not null
      and unit_sale_id is not null
    )
  )
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_result_center_id_idx on public.products (result_center_id);
create index if not exists products_erp_code_idx on public.products (erp_code);
create index if not exists products_registration_status_idx on public.products (registration_status);
create index if not exists products_is_new_standard_idx on public.products (is_new_standard) where is_new_standard;

create table if not exists public.product_suppliers (
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  is_alternate boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (product_id, supplier_id)
);

create table if not exists public.product_cost_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  previous_cost numeric,
  new_cost numeric,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_cost_history_product_idx on public.product_cost_history (product_id, created_at desc);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  previous_price numeric,
  new_price numeric,
  previous_cost_snapshot numeric,
  new_cost_snapshot numeric,
  previous_margin_pct numeric,
  new_margin_pct numeric,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_price_history_product_idx on public.product_price_history (product_id, created_at desc);

create table if not exists public.product_score_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  previous_score smallint,
  new_score smallint,
  pendencies_snapshot text[],
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_score_history_product_idx on public.product_score_history (product_id, created_at desc);

create or replace function public.eval_product_registration(p public.products)
returns table (score smallint, pendencies text[])
language plpgsql
stable
set search_path to public
as $$
declare
  s int := 0;
  pend text[] := array[]::text[];
  desc_ok boolean := p.description is not null and length(trim(both from p.description)) >= 2;
begin
  if desc_ok then
    s := s + 10;
  else
    pend := array_append(pend, 'sem descrição adequada');
  end if;

  if p.category_id is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem categoria');
  end if;

  if p.brand_id is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem marca');
  end if;

  if p.primary_supplier_id is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem fornecedor principal');
  end if;

  if p.unit_purchase_id is not null and p.unit_sale_id is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem unidade de compra/venda');
  end if;

  if p.management_cost is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem custo gerencial');
  end if;

  if p.management_price is not null and p.management_price > 0 then
    s := s + 10;
  else
    pend := array_append(pend, 'sem preço gerencial');
  end if;

  if p.margin_minimum_pct is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem margem mínima');
  end if;

  if p.min_stock is not null then
    s := s + 10;
  else
    pend := array_append(pend, 'sem estoque mínimo');
  end if;

  if p.default_location is not null and length(trim(both from p.default_location)) > 0 then
    s := s + 10;
  else
    pend := array_append(pend, 'sem localização');
  end if;

  score := least(100, s)::smallint;
  pendencies := pend;
  return next;
end;
$$;

create or replace function public.trg_products_before_write()
returns trigger
language plpgsql
set search_path to public
as $$
declare
  ev_score smallint;
  ev_pend text[];
begin
  select e.score, e.pendencies into ev_score, ev_pend
  from public.eval_product_registration(new) as e;

  new.registration_score := ev_score;
  new.pendencies := coalesce(ev_pend, '{}');
  new.registration_status := case when ev_score >= 100 then 'complete' else 'incomplete' end;
  return new;
end;
$$;

drop trigger if exists tr_products_before_write on public.products;
create trigger tr_products_before_write
  before insert or update on public.products
  for each row
  execute function public.trg_products_before_write();
