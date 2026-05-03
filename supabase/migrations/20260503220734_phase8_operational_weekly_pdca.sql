-- Fase 8 — Indicadores operacionais (agregação na app), rotina semanal (pauta + registro + tarefas), melhorias PDCA leve.
-- Pré-requisito: profiles, tasks, touch_updated_at, log_row_audit, is_admin_or_gestor.
-- Versão alinhada ao registo aplicado no remoto (MCP apply_migration).

-- ---------------------------------------------------------------------------
-- weekly_actions → tasks
-- ---------------------------------------------------------------------------

alter table public.weekly_actions
  add column if not exists related_task_id uuid references public.tasks (id) on delete set null;

create index if not exists weekly_actions_related_task_idx on public.weekly_actions (related_task_id);

-- ---------------------------------------------------------------------------
-- Rotina semanal: pauta fixa (template) + registro por semana
-- ---------------------------------------------------------------------------

create table if not exists public.weekly_routine_templates (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 1 and 7),
  title text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_routine_templates_week_title unique (weekday, title)
);

create index if not exists weekly_routine_templates_dow_idx on public.weekly_routine_templates (weekday, sort_order);

create table if not exists public.weekly_routine_logs (
  id uuid primary key default gen_random_uuid(),
  week_start_monday date not null,
  template_id uuid references public.weekly_routine_templates (id) on delete set null,
  title text not null,
  notes text,
  completed_at timestamptz,
  related_task_id uuid references public.tasks (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_routine_logs_week_idx on public.weekly_routine_logs (week_start_monday);
create index if not exists weekly_routine_logs_template_idx on public.weekly_routine_logs (template_id);

create unique index if not exists weekly_routine_logs_week_tpl_unique
  on public.weekly_routine_logs (week_start_monday, template_id)
  where template_id is not null;

-- ---------------------------------------------------------------------------
-- Melhorias (PDCA leve)
-- ---------------------------------------------------------------------------

create table if not exists public.improvements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem_statement text,
  status text not null default 'plan'
    check (status in ('brainstorm', 'plan', 'do', 'check', 'act', 'closed')),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  plan_notes text,
  do_notes text,
  check_notes text,
  act_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists improvements_status_idx on public.improvements (status);
create index if not exists improvements_owner_idx on public.improvements (owner_id);

-- ---------------------------------------------------------------------------
-- Helpers + triggers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_weekly_and_improvements()
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

drop trigger if exists tr_touch_updated_at on public.weekly_routine_templates;
create trigger tr_touch_updated_at
  before update on public.weekly_routine_templates
  for each row
  execute function public.touch_updated_at();

drop trigger if exists tr_touch_updated_at on public.weekly_routine_logs;
create trigger tr_touch_updated_at
  before update on public.weekly_routine_logs
  for each row
  execute function public.touch_updated_at();

drop trigger if exists tr_touch_updated_at on public.improvements;
create trigger tr_touch_updated_at
  before update on public.improvements
  for each row
  execute function public.touch_updated_at();

drop trigger if exists tr_audit_row on public.weekly_routine_templates;
create trigger tr_audit_row
  after insert or update or delete on public.weekly_routine_templates
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.weekly_routine_logs;
create trigger tr_audit_row
  after insert or update or delete on public.weekly_routine_logs
  for each row
  execute function public.log_row_audit();

drop trigger if exists tr_audit_row on public.improvements;
create trigger tr_audit_row
  after insert or update or delete on public.improvements
  for each row
  execute function public.log_row_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.weekly_routine_templates enable row level security;
alter table public.weekly_routine_logs enable row level security;
alter table public.improvements enable row level security;

drop policy if exists weekly_routine_templates_select on public.weekly_routine_templates;
create policy weekly_routine_templates_select
  on public.weekly_routine_templates for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists weekly_routine_templates_write on public.weekly_routine_templates;
create policy weekly_routine_templates_write
  on public.weekly_routine_templates for all to authenticated
  using ((select public.can_manage_weekly_and_improvements()))
  with check ((select public.can_manage_weekly_and_improvements()));

drop policy if exists weekly_routine_logs_select on public.weekly_routine_logs;
create policy weekly_routine_logs_select
  on public.weekly_routine_logs for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists weekly_routine_logs_write on public.weekly_routine_logs;
create policy weekly_routine_logs_write
  on public.weekly_routine_logs for all to authenticated
  using ((select public.can_manage_weekly_and_improvements()))
  with check ((select public.can_manage_weekly_and_improvements()));

drop policy if exists improvements_select on public.improvements;
create policy improvements_select
  on public.improvements for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active = true));

drop policy if exists improvements_insert on public.improvements;
create policy improvements_insert
  on public.improvements for insert to authenticated
  with check (
    owner_id = auth.uid()
    or (select public.can_manage_weekly_and_improvements())
  );

drop policy if exists improvements_update on public.improvements;
create policy improvements_update
  on public.improvements for update to authenticated
  using (
    owner_id = auth.uid()
    or (select public.can_manage_weekly_and_improvements())
  )
  with check (
    owner_id = auth.uid()
    or (select public.can_manage_weekly_and_improvements())
  );

drop policy if exists improvements_delete on public.improvements;
create policy improvements_delete
  on public.improvements for delete to authenticated
  using ((select public.can_manage_weekly_and_improvements()));

revoke all on public.weekly_routine_templates, public.weekly_routine_logs, public.improvements from anon;

grant select, insert, update, delete on public.weekly_routine_templates to authenticated;
grant select, insert, update, delete on public.weekly_routine_logs to authenticated;
grant select, insert, update, delete on public.improvements to authenticated;

grant execute on function public.can_manage_weekly_and_improvements() to authenticated;

revoke execute on function public.can_manage_weekly_and_improvements() from public;
grant execute on function public.can_manage_weekly_and_improvements() to postgres;
grant execute on function public.can_manage_weekly_and_improvements() to service_role;

-- ---------------------------------------------------------------------------
-- Seed pauta base (1 semana de referência — segunda a sexta)
-- ---------------------------------------------------------------------------

insert into public.weekly_routine_templates (weekday, title, description, sort_order)
values
  (1, 'Revisão de alertas e tarefas', 'Sincronizar alertas críticos e tarefas da semana (30 min).', 10),
  (2, 'Compras e stock mínimo', 'Sugestões em aberto e rupturas (20 min).', 20),
  (3, 'Recebimento e conferência', 'Recebimentos pendentes de checklist (20 min).', 30),
  (4, 'Oficina e OS paradas', 'OS sem atividade e peças críticas (20 min).', 40),
  (5, 'Fecho da semana', 'Indicadores rápidos e próximos passos (30 min).', 50)
on conflict (weekday, title) do nothing;
