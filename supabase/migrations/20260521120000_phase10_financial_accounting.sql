-- Fase 10 — Painel financeiro + contábil (importação AR/AP, fluxo projetado, DRE, impostos, notas).
-- PRD §18.3: cada registo expõe data_source, reference_date (data de referência do dado) e captured_at (última atualização no CRM).

-- ---------------------------------------------------------------------------

create or replace function public.can_manage_financial_panel()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select public.has_role(array['admin', 'gestor', 'financeiro']::text[]);
$$;

-- ---------------------------------------------------------------------------
-- Lotes de importação (rastreio de ficheiro + rótulo de fonte aplicado ao lote)
-- ---------------------------------------------------------------------------

create table if not exists public.financial_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  category text not null
    check (category in ('ar', 'ap', 'cashflow', 'dre', 'taxes', 'notes')),
  source_filename text,
  data_source_label text not null default 'import_csv',
  status text not null default 'committed' check (status in ('draft', 'committed', 'failed')),
  row_count int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_import_batches_cat_idx on public.financial_import_batches (category, created_at desc);

-- ---------------------------------------------------------------------------
-- Contas a receber (AR)
-- ---------------------------------------------------------------------------

create table if not exists public.financial_receivables (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.financial_import_batches (id) on delete set null,
  customer_name text not null,
  document_number text not null,
  issue_date date not null,
  due_date date not null,
  amount_original numeric(18, 2) not null,
  amount_open numeric(18, 2) not null,
  currency text not null default 'BRL',
  data_source text not null,
  reference_date date not null,
  captured_at timestamptz not null default now(),
  constraint financial_receivables_doc_unique unique (document_number, customer_name, due_date)
);

create index if not exists financial_receivables_due_idx on public.financial_receivables (due_date);
create index if not exists financial_receivables_open_idx on public.financial_receivables (amount_open);

-- ---------------------------------------------------------------------------
-- Contas a pagar (AP)
-- ---------------------------------------------------------------------------

create table if not exists public.financial_payables (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.financial_import_batches (id) on delete set null,
  supplier_name text not null,
  document_number text not null,
  issue_date date not null,
  due_date date not null,
  amount_original numeric(18, 2) not null,
  amount_open numeric(18, 2) not null,
  currency text not null default 'BRL',
  data_source text not null,
  reference_date date not null,
  captured_at timestamptz not null default now(),
  constraint financial_payables_doc_unique unique (document_number, supplier_name, due_date)
);

create index if not exists financial_payables_due_idx on public.financial_payables (due_date);

-- ---------------------------------------------------------------------------
-- Fluxo de caixa projetado
-- ---------------------------------------------------------------------------

create table if not exists public.financial_cash_projections (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.financial_import_batches (id) on delete set null,
  projection_date date not null,
  description text not null,
  inflow numeric(18, 2) not null default 0,
  outflow numeric(18, 2) not null default 0,
  data_source text not null,
  reference_date date not null,
  captured_at timestamptz not null default now()
);

create index if not exists financial_cash_projections_date_idx on public.financial_cash_projections (projection_date);

-- ---------------------------------------------------------------------------
-- DRE contábil (linhas importadas)
-- ---------------------------------------------------------------------------

create table if not exists public.financial_dre_contabil (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.financial_import_batches (id) on delete set null,
  period_month date not null,
  section text not null,
  account_code text not null,
  account_name text not null,
  amount numeric(18, 2) not null,
  data_source text not null,
  reference_date date not null,
  captured_at timestamptz not null default now(),
  constraint financial_dre_contabil_line_unique unique (period_month, account_code, section)
);

create index if not exists financial_dre_contabil_period_idx on public.financial_dre_contabil (period_month);

-- ---------------------------------------------------------------------------
-- Impostos
-- ---------------------------------------------------------------------------

create table if not exists public.financial_tax_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.financial_import_batches (id) on delete set null,
  period_month date not null,
  tax_code text not null,
  tax_name text not null,
  amount numeric(18, 2) not null,
  data_source text not null,
  reference_date date not null,
  captured_at timestamptz not null default now(),
  constraint financial_tax_entries_unique unique (period_month, tax_code)
);

create index if not exists financial_tax_entries_period_idx on public.financial_tax_entries (period_month);

-- ---------------------------------------------------------------------------
-- Notas contábeis / memorandos
-- ---------------------------------------------------------------------------

create table if not exists public.financial_accounting_notes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.financial_import_batches (id) on delete set null,
  period_month date not null,
  title text not null,
  body text,
  data_source text not null,
  reference_date date not null,
  captured_at timestamptz not null default now()
);

create index if not exists financial_accounting_notes_period_idx on public.financial_accounting_notes (period_month);

-- ---------------------------------------------------------------------------
-- Resumo inadimplência AR (leitura)
-- ---------------------------------------------------------------------------

create or replace function public.financial_ar_delinquency_summary()
returns table (
  total_open numeric,
  overdue_open numeric,
  overdue_lines bigint,
  lines_open bigint
)
language plpgsql
stable
security definer
set search_path to public
as $$
begin
  if not public.can_manage_financial_panel() then
    raise exception 'Sem permissão';
  end if;
  return query
  select
    coalesce(sum(r.amount_open), 0)::numeric(18, 2) as total_open,
    coalesce(sum(case when r.due_date < (current_date) and r.amount_open > 0 then r.amount_open else 0 end), 0)::numeric(18, 2) as overdue_open,
    count(*) filter (where r.due_date < current_date and r.amount_open > 0)::bigint as overdue_lines,
    count(*) filter (where r.amount_open > 0)::bigint as lines_open
  from public.financial_receivables r;
end;
$$;

create or replace function public.financial_ap_delinquency_summary()
returns table (
  total_open numeric,
  overdue_open numeric,
  overdue_lines bigint,
  lines_open bigint
)
language plpgsql
stable
security definer
set search_path to public
as $$
begin
  if not public.can_manage_financial_panel() then
    raise exception 'Sem permissão';
  end if;
  return query
  select
    coalesce(sum(p.amount_open), 0)::numeric(18, 2) as total_open,
    coalesce(sum(case when p.due_date < (current_date) and p.amount_open > 0 then p.amount_open else 0 end), 0)::numeric(18, 2) as overdue_open,
    count(*) filter (where p.due_date < current_date and p.amount_open > 0)::bigint as overdue_lines,
    count(*) filter (where p.amount_open > 0)::bigint as lines_open
  from public.financial_payables p;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers updated_at em lotes
-- ---------------------------------------------------------------------------

drop trigger if exists tr_touch_updated_at on public.financial_import_batches;
create trigger tr_touch_updated_at
  before update on public.financial_import_batches
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.financial_import_batches enable row level security;
alter table public.financial_receivables enable row level security;
alter table public.financial_payables enable row level security;
alter table public.financial_cash_projections enable row level security;
alter table public.financial_dre_contabil enable row level security;
alter table public.financial_tax_entries enable row level security;
alter table public.financial_accounting_notes enable row level security;

drop policy if exists fib_select on public.financial_import_batches;
create policy fib_select
  on public.financial_import_batches for select to authenticated
  using (public.can_manage_financial_panel());

drop policy if exists fib_insert on public.financial_import_batches;
create policy fib_insert
  on public.financial_import_batches for insert to authenticated
  with check (public.can_manage_financial_panel() and created_by = auth.uid());

drop policy if exists fib_update on public.financial_import_batches;
create policy fib_update
  on public.financial_import_batches for update to authenticated
  using (public.can_manage_financial_panel() and (created_by = auth.uid() or public.is_admin_or_gestor()))
  with check (public.can_manage_financial_panel() and (created_by = auth.uid() or public.is_admin_or_gestor()));

drop policy if exists fin_ar_select on public.financial_receivables;
create policy fin_ar_select on public.financial_receivables for select to authenticated
  using (public.can_manage_financial_panel());
drop policy if exists fin_ar_insert on public.financial_receivables;
create policy fin_ar_insert on public.financial_receivables for insert to authenticated
  with check (public.can_manage_financial_panel());
drop policy if exists fin_ar_delete on public.financial_receivables;
create policy fin_ar_delete on public.financial_receivables for delete to authenticated
  using (public.is_admin_or_gestor());

drop policy if exists fin_ap_select on public.financial_payables;
create policy fin_ap_select on public.financial_payables for select to authenticated
  using (public.can_manage_financial_panel());
drop policy if exists fin_ap_insert on public.financial_payables;
create policy fin_ap_insert on public.financial_payables for insert to authenticated
  with check (public.can_manage_financial_panel());
drop policy if exists fin_ap_delete on public.financial_payables;
create policy fin_ap_delete on public.financial_payables for delete to authenticated
  using (public.is_admin_or_gestor());

drop policy if exists fin_cf_select on public.financial_cash_projections;
create policy fin_cf_select on public.financial_cash_projections for select to authenticated
  using (public.can_manage_financial_panel());
drop policy if exists fin_cf_insert on public.financial_cash_projections;
create policy fin_cf_insert on public.financial_cash_projections for insert to authenticated
  with check (public.can_manage_financial_panel());
drop policy if exists fin_cf_delete on public.financial_cash_projections;
create policy fin_cf_delete on public.financial_cash_projections for delete to authenticated
  using (public.is_admin_or_gestor());

drop policy if exists fin_dre_select on public.financial_dre_contabil;
create policy fin_dre_select on public.financial_dre_contabil for select to authenticated
  using (public.can_manage_financial_panel());
drop policy if exists fin_dre_insert on public.financial_dre_contabil;
create policy fin_dre_insert on public.financial_dre_contabil for insert to authenticated
  with check (public.can_manage_financial_panel());
drop policy if exists fin_dre_delete on public.financial_dre_contabil;
create policy fin_dre_delete on public.financial_dre_contabil for delete to authenticated
  using (public.is_admin_or_gestor());

drop policy if exists fin_tax_select on public.financial_tax_entries;
create policy fin_tax_select on public.financial_tax_entries for select to authenticated
  using (public.can_manage_financial_panel());
drop policy if exists fin_tax_insert on public.financial_tax_entries;
create policy fin_tax_insert on public.financial_tax_entries for insert to authenticated
  with check (public.can_manage_financial_panel());
drop policy if exists fin_tax_delete on public.financial_tax_entries;
create policy fin_tax_delete on public.financial_tax_entries for delete to authenticated
  using (public.is_admin_or_gestor());

drop policy if exists fin_notes_select on public.financial_accounting_notes;
create policy fin_notes_select on public.financial_accounting_notes for select to authenticated
  using (public.can_manage_financial_panel());
drop policy if exists fin_notes_insert on public.financial_accounting_notes;
create policy fin_notes_insert on public.financial_accounting_notes for insert to authenticated
  with check (public.can_manage_financial_panel());
drop policy if exists fin_notes_delete on public.financial_accounting_notes;
create policy fin_notes_delete on public.financial_accounting_notes for delete to authenticated
  using (public.is_admin_or_gestor());

revoke all on public.financial_import_batches, public.financial_receivables, public.financial_payables,
  public.financial_cash_projections, public.financial_dre_contabil, public.financial_tax_entries,
  public.financial_accounting_notes from anon;

grant select, insert, update, delete on public.financial_import_batches to authenticated;
grant select, insert, delete on public.financial_receivables to authenticated;
grant select, insert, delete on public.financial_payables to authenticated;
grant select, insert, delete on public.financial_cash_projections to authenticated;
grant select, insert, delete on public.financial_dre_contabil to authenticated;
grant select, insert, delete on public.financial_tax_entries to authenticated;
grant select, insert, delete on public.financial_accounting_notes to authenticated;

grant execute on function public.can_manage_financial_panel() to authenticated;
grant execute on function public.financial_ar_delinquency_summary() to authenticated;
grant execute on function public.financial_ap_delinquency_summary() to authenticated;

revoke execute on function public.can_manage_financial_panel() from public;
revoke execute on function public.financial_ar_delinquency_summary() from public;
revoke execute on function public.financial_ap_delinquency_summary() from public;

grant execute on function public.can_manage_financial_panel() to service_role;
grant execute on function public.financial_ar_delinquency_summary() to service_role;
grant execute on function public.financial_ap_delinquency_summary() to service_role;
