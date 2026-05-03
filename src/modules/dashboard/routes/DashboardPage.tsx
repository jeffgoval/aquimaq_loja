import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, ListTodo, Package, Percent } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ds/primitives';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { countOpenStockBelowMinAlerts } from '@modules/inventory/services/inventoryApi';
import {
  countOpenTasks,
  fetchNewStandardSnapshot,
  listCriticalAlerts,
  listWeeklyActionsDueSoon,
  type AlertListItem,
  type NewStandardSnapshot,
  type WeeklyActionListItem,
} from '../services/dashboardApi';
import { ROLE_LABELS } from '@shared/types/database';

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
}

function formatDayHeader(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function priorityBadgeVariant(p: string): 'danger' | 'warning' | 'secondary' | 'default' {
  const x = p.toLowerCase();
  if (x === 'critica') return 'danger';
  if (x === 'alta') return 'warning';
  return 'secondary';
}

function isCriticalPriority(p: string, impact: string | null): boolean {
  const pl = p.toLowerCase();
  const il = (impact ?? '').toLowerCase();
  return pl === 'critica' || pl === 'alta' || il === 'critico' || il === 'crítico';
}

function AlertRowItem({ row }: { row: AlertListItem }) {
  const critical = isCriticalPriority(row.priority, row.impact);
  return (
    <div
      className={`flex flex-col gap-1 border-b border-border py-3 last:border-0 last:pb-0 ${critical ? 'pl-2 border-l-2 border-l-danger' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{row.title}</span>
        <Badge variant={priorityBadgeVariant(row.priority)}>{row.priority}</Badge>
        {row.type ? (
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.type}</span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{row.reason}</p>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {row.due_date ? <span>Prazo {formatShortDate(row.due_date)}</span> : null}
        {row.responsible?.full_name ? <span>Resp. {row.responsible.full_name}</span> : null}
        {row.origin ? <span>Origem {row.origin}</span> : null}
      </div>
    </div>
  );
}

function WeeklyRowItem({ row }: { row: WeeklyActionListItem }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{row.title}</span>
        <Badge variant="secondary">{row.priority}</Badge>
      </div>
      {row.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>Prazo {formatShortDate(row.due_date)}</span>
        {row.responsible?.full_name ? <span>{row.responsible.full_name}</span> : null}
      </div>
    </div>
  );
}

/**
 * Painel da Casa v1 (PRD §9) — visão executiva diária: métrica composta, alertas críticos, ações da semana.
 */
export function DashboardPage() {
  const user = useCurrentUser();
  const snapshotQ = useQuery<NewStandardSnapshot>({
    queryKey: ['dashboard', 'snapshot'],
    queryFn: fetchNewStandardSnapshot,
  });
  const alertsQ = useQuery<AlertListItem[]>({
    queryKey: ['dashboard', 'critical_alerts'],
    queryFn: () => listCriticalAlerts(12),
  });
  const weeklyQ = useQuery<WeeklyActionListItem[]>({
    queryKey: ['dashboard', 'weekly_actions'],
    queryFn: () => listWeeklyActionsDueSoon(15),
  });
  const tasksQ = useQuery<number>({ queryKey: ['dashboard', 'open_tasks_count'], queryFn: countOpenTasks });
  const stockAlertsQ = useQuery<number>({
    queryKey: ['dashboard', 'stock_below_min'],
    queryFn: countOpenStockBelowMinAlerts,
  });

  if (!user) return null;

  const snap = snapshotQ.data;
  const criticalCount = (alertsQ.data ?? []).filter((a) => isCriticalPriority(a.priority, a.impact)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel da Casa</h1>
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{user.fullName}</span> ·{' '}
            <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>
          </p>
        </div>
        <p className="text-xs capitalize text-muted-foreground sm:text-right">{formatDayHeader()}</p>
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Resumo operacional: situação de cadastro e padrão novo, riscos em aberto e o que a equipa deve fechar na
        próxima semana — leitura em cerca de 30 segundos.
      </p>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="border-amber-500/25 bg-amber-500/[0.03] lg:col-span-7">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Alertas críticos
              </CardTitle>
              <CardDescription>
                Abertos, prioridade alta/crítica ou impacto crítico primeiro. Até 12 itens.
              </CardDescription>
            </div>
            {!alertsQ.isLoading ? (
              <Badge variant="warning" className="shrink-0 tabular-nums">
                {criticalCount} prioritários
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {alertsQ.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar alertas…</p>
            ) : alertsQ.error ? (
              <p className="text-sm text-danger">{(alertsQ.error as Error).message}</p>
            ) : (alertsQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem alertas abertos neste momento.</p>
            ) : (
              <div>
                {(alertsQ.data ?? []).map((row) => (
                  <AlertRowItem key={row.id} row={row} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                % operação no padrão novo
              </CardDescription>
              <CardTitle className="text-4xl tabular-nums tracking-tight">
                {snapshotQ.isLoading ? '…' : `${snap?.pct ?? 0}%`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {snapshotQ.error ? (
                <p className="text-danger">{(snapshotQ.error as Error).message}</p>
              ) : snap ? (
                <>
                  <p>
                    <span className="font-semibold text-foreground">{snap.newStandardCount}</span> de{' '}
                    <span className="font-semibold text-foreground">{snap.activeTotal}</span> produtos ativos no padrão
                    novo (cadastro mestre + política comercial).
                  </p>
                  <p className="text-xs">
                    Cálculo composto: percentagem na base (<code className="text-foreground">dashboard_new_standard_pct</code>
                    ) com contagem explícita para contexto imediato.
                  </p>
                </>
              ) : null}
              <Button variant="outline" size="sm" className="mt-2 w-full gap-1 sm:w-auto" asChild>
                <Link to="/products">
                  <Package className="h-4 w-4" />
                  Cadastro mestre
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Indicadores rápidos</CardTitle>
              <CardDescription>Tarefas e estoque gerencial (Fase 3).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/tasks"
                className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ListTodo className="h-4 w-4" />
                  Tarefas abertas
                </span>
                <span className="tabular-nums text-lg font-semibold text-foreground">
                  {tasksQ.isLoading ? '…' : tasksQ.data ?? 0}
                </span>
              </Link>
              <Link
                to="/inventory"
                className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Estoque &lt; mín.
                </span>
                <span className="tabular-nums text-lg font-semibold text-foreground">
                  {stockAlertsQ.isLoading ? '…' : stockAlertsQ.data ?? 0}
                </span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              Ações da semana
            </CardTitle>
            <CardDescription>Em aberto com prazo nos próximos 14 dias (rotina semanal).</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link to="/tasks">
              Ver tarefas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {weeklyQ.isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar ações…</p>
          ) : weeklyQ.error ? (
            <p className="text-sm text-danger">{(weeklyQ.error as Error).message}</p>
          ) : (weeklyQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação semanal pendente neste horizonte.</p>
          ) : (
            <div>
              {(weeklyQ.data ?? []).map((row) => (
                <WeeklyRowItem key={row.id} row={row} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
