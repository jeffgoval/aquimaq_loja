-- Mestras CRM: deleted_at (soft delete), created_by / updated_by (→ profiles) + trigger genérico.
-- Listagens na app devem filtrar deleted_at IS NULL (além de is_active quando aplicável).

-- ---------------------------------------------------------------------------
create or replace function public.crm_set_master_row_audit()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null and auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
    if new.updated_by is null and auth.uid() is not null then
      new.updated_by := auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    if auth.uid() is not null then
      new.updated_by := auth.uid();
    end if;
    new.created_by := coalesce(new.created_by, old.created_by);
  end if;
  return new;
end;
$$;

revoke all on function public.crm_set_master_row_audit() from public;

-- ---------------------------------------------------------------------------
-- Colunas (idempotente)
-- ---------------------------------------------------------------------------

alter table public.brands add column if not exists deleted_at timestamptz;
alter table public.brands add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.brands add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.cost_centers add column if not exists deleted_at timestamptz;
alter table public.cost_centers add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.cost_centers add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.suppliers add column if not exists deleted_at timestamptz;
alter table public.suppliers add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.suppliers add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.units add column if not exists deleted_at timestamptz;
alter table public.units add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.units add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.product_categories add column if not exists deleted_at timestamptz;
alter table public.product_categories add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.product_categories add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.subcategories add column if not exists deleted_at timestamptz;
alter table public.subcategories add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.subcategories add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.result_centers add column if not exists deleted_at timestamptz;
alter table public.result_centers add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.result_centers add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.products add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.products add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.stock_locations add column if not exists deleted_at timestamptz;
alter table public.stock_locations add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.stock_locations add column if not exists updated_by uuid references public.profiles (id) on delete set null;

alter table public.stock_types add column if not exists deleted_at timestamptz;
alter table public.stock_types add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.stock_types add column if not exists updated_by uuid references public.profiles (id) on delete set null;

create index if not exists brands_deleted_at_null_idx on public.brands (id) where deleted_at is null;
create index if not exists cost_centers_deleted_at_null_idx on public.cost_centers (id) where deleted_at is null;
create index if not exists suppliers_deleted_at_null_idx on public.suppliers (id) where deleted_at is null;
create index if not exists units_deleted_at_null_idx on public.units (id) where deleted_at is null;
create index if not exists product_categories_deleted_at_null_idx on public.product_categories (id) where deleted_at is null;
create index if not exists subcategories_deleted_at_null_idx on public.subcategories (id) where deleted_at is null;
create index if not exists result_centers_deleted_at_null_idx on public.result_centers (id) where deleted_at is null;
create index if not exists products_deleted_at_null_idx on public.products (id) where deleted_at is null;
create index if not exists stock_locations_deleted_at_null_idx on public.stock_locations (id) where deleted_at is null;
create index if not exists stock_types_deleted_at_null_idx on public.stock_types (id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Triggers BEFORE INSERT/UPDATE
-- ---------------------------------------------------------------------------

drop trigger if exists tr_crm_master_row_audit on public.brands;
create trigger tr_crm_master_row_audit
  before insert or update on public.brands
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.cost_centers;
create trigger tr_crm_master_row_audit
  before insert or update on public.cost_centers
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.suppliers;
create trigger tr_crm_master_row_audit
  before insert or update on public.suppliers
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.units;
create trigger tr_crm_master_row_audit
  before insert or update on public.units
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.product_categories;
create trigger tr_crm_master_row_audit
  before insert or update on public.product_categories
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.subcategories;
create trigger tr_crm_master_row_audit
  before insert or update on public.subcategories
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.result_centers;
create trigger tr_crm_master_row_audit
  before insert or update on public.result_centers
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.products;
create trigger tr_crm_master_row_audit
  before insert or update on public.products
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.stock_locations;
create trigger tr_crm_master_row_audit
  before insert or update on public.stock_locations
  for each row execute function public.crm_set_master_row_audit();

drop trigger if exists tr_crm_master_row_audit on public.stock_types;
create trigger tr_crm_master_row_audit
  before insert or update on public.stock_types
  for each row execute function public.crm_set_master_row_audit();
