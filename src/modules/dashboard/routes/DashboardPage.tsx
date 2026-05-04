import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, ListTodo, Package, TrendingUp } from 'lucide-react';
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
      className={`flex flex-col gap-1 border-b border-border py-3 last:border-0 last:pb-0 ${
        critical ? 'pl-3 border-l-2 border-l-danger -ml-px' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-foreground">{row.title}</span>
        <Badge variant={priorityBadgeVariant(row.priority)}>{row.priority}</Badge>
        {row.type ? (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{row.type}</span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-[12px] text-muted-foreground leading-relaxed">{row.reason}</p>
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
        <span className="text-[13px] font-semibold text-foreground">{row.title}</span>
        <Badge variant="secondary">{row.priority}</Badge>
      </div>
      {row.description ? (
        <p className="line-clamp-2 text-[12px] text-muted-foreground leading-relaxed">{row.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>Prazo {formatShortDate(row.due_date)}</span>
        {row.responsible?.full_name ? <span>{row.responsible.full_name}</span> : null}
      </div>
    </div>
  );
}

function StatCard({
  to,
  icon: Icon,
  label,
  value,
  loading,
}: {
  to: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded border border-border bg-surface px-4 py-3 shadow-card transition-shadow hover:shadow-card-md"
    >
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="tabular-nums text-xl font-bold text-foreground">
        {loading ? '—' : (value ?? 0)}
      </span>
    </Link>
  );
}

/** Painel principal: adesão ao padrão novo, alertas prioritários e ações da rotina semanal. */
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
    <div className="space-y-6 max-w-[1200px]">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Painel da Casa</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Olá, <span className="font-medium text-foreground">{user.fullName}</span>
            <span className="mx-1.5 text-border-strong">·</span>
            <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>
          </p>
        </div>
        <p className="text-[11px] capitalize text-muted-foreground sm:text-right">{formatDayHeader()}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* % Padrão novo */}
        <div className="col-span-2 sm:col-span-2 flex items-stretch gap-3">
          <Card className="flex-1">
            <CardHeader className="pb-1">
              <CardDescription className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Padrão novo
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums font-bold text-foreground tracking-tight">
                {snapshotQ.isLoading ? '—' : `${snap?.pct ?? 0}%`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-[12px] text-muted-foreground">
              {snap ? (
                <p>
                  <span className="font-semibold text-foreground">{snap.newStandardCount}</span>
                  {' de '}
                  <span className="font-semibold text-foreground">{snap.activeTotal}</span>
                  {' produtos ativos'}
                </p>
              ) : null}
              <Button variant="outline" size="sm" className="mt-2 gap-1" asChild>
                <Link to="/products">
                  <Package className="h-3.5 w-3.5" />
                  Cadastro mestre
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="col-span-2 flex flex-col gap-3">
          <StatCard
            to="/tasks"
            icon={ListTodo}
            label="Tarefas abertas"
            value={tasksQ.data}
            loading={tasksQ.isLoading}
          />
          <StatCard
            to="/inventory"
            icon={AlertTriangle}
            label="Estoque abaixo do mínimo"
            value={stockAlertsQ.data}
            loading={stockAlertsQ.isLoading}
          />
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Alertas críticos */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas críticos
              </CardTitle>
              <CardDescription>Abertos com prioridade alta/crítica ou impacto crítico. Até 12 itens.</CardDescription>
            </div>
            {!alertsQ.isLoading && criticalCount > 0 ? (
              <Badge variant="warning" className="shrink-0 tabular-nums">
                {criticalCount} prioritários
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {alertsQ.isLoading ? (
              <p className="text-[13px] text-muted-foreground">A carregar…</p>
            ) : alertsQ.error ? (
              <p className="text-[13px] text-danger">{(alertsQ.error as Error).message}</p>
            ) : (alertsQ.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Sem alertas abertos neste momento.</p>
            ) : (
              <div>
                {(alertsQ.data ?? []).map((row) => (
                  <AlertRowItem key={row.id} row={row} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações da semana */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Ações da semana
              </CardTitle>
              <CardDescription>Prazo nos próximos 14 dias (rotina semanal).</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 -mr-1" asChild>
              <Link to="/tasks">
                Ver tarefas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {weeklyQ.isLoading ? (
              <p className="text-[13px] text-muted-foreground">A carregar…</p>
            ) : weeklyQ.error ? (
              <p className="text-[13px] text-danger">{(weeklyQ.error as Error).message}</p>
            ) : (weeklyQ.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhuma ação pendente neste horizonte.</p>
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
    </div>
  );
}
