import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ListTodo,
  Package,
  ShoppingCart,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ds/primitives';
import { fetchOperationalSnapshot } from '../services/operationalIndicatorsApi';

function StatCard(props: {
  title: string;
  value: number;
  hint?: string;
  to?: string;
  actionLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{props.value}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
        {props.hint ? <p>{props.hint}</p> : null}
        {props.to && props.actionLabel ? (
          <Button variant="outline" size="sm" className="w-fit gap-1" asChild>
            <Link to={props.to}>
              {props.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OperationalIndicatorsPage() {
  const q = useQuery({
    queryKey: ['operational-snapshot'],
    queryFn: fetchOperationalSnapshot,
  });

  if (q.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">A carregar indicadores…</p>;
  }
  if (q.isError) {
    return (
      <p className="p-6 text-sm text-destructive">
        {q.error instanceof Error ? q.error.message : 'Erro ao carregar indicadores.'}
      </p>
    );
  }

  const s = q.data;
  if (!s) return null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Indicadores operacionais</h1>
        <p className="text-sm text-muted-foreground">
          Vista única das filas e riscos dos módulos (alertas, tarefas, compras, recebimento, oficina, stock e rotina).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Alertas abertos"
          value={s.alertsOpen}
          hint={`~${s.alertsCriticalApprox} com prioridade/impacto alto ou crítico.`}
          to="/"
          actionLabel="Ver painel"
        />
        <StatCard title="Tarefas em aberto" value={s.tasksOpen} to="/tasks" actionLabel="Abrir tarefas" />
        <StatCard
          title="Sugestões de compra ativas"
          value={s.purchaseSuggestionsOpen}
          to="/purchases"
          actionLabel="Abrir compras"
        />
        <StatCard
          title="Recebimentos em conferência"
          value={s.receiptsPendingCheck}
          to="/receiving"
          actionLabel="Abrir recebimento"
        />
        <StatCard title="OS em andamento" value={s.workOrdersInProgress} to="/workshop" actionLabel="Abrir oficina" />
        <StatCard
          title="Alertas de stock abaixo do mínimo"
          value={s.stockBelowMinAlerts}
          to="/inventory"
          actionLabel="Abrir estoque"
        />
        <StatCard
          title="Ações semanais (próx. 14 dias)"
          value={s.weeklyActionsOpenSoon}
          hint="Itens da rotina semanal com prazo aproximando."
          to="/weekly-routine"
          actionLabel="Rotina semanal"
        />
        <StatCard
          title="Melhorias PDCA em curso"
          value={s.improvementsActive}
          to="/improvements"
          actionLabel="Abrir melhorias"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atalhos</CardTitle>
          <CardDescription>Módulos que alimentam estes números.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/" className="gap-1">
              <AlertTriangle className="h-4 w-4" /> Painel
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/tasks" className="gap-1">
              <ListTodo className="h-4 w-4" /> Tarefas
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/purchases" className="gap-1">
              <ShoppingCart className="h-4 w-4" /> Compras
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/receiving" className="gap-1">
              <Truck className="h-4 w-4" /> Recebimento
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/workshop" className="gap-1">
              <Wrench className="h-4 w-4" /> Oficina
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/inventory" className="gap-1">
              <Package className="h-4 w-4" /> Estoque
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/weekly-routine" className="gap-1">
              <CalendarClock className="h-4 w-4" /> Rotina semanal
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/improvements" className="gap-1">
              <Sparkles className="h-4 w-4" /> Melhorias
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
