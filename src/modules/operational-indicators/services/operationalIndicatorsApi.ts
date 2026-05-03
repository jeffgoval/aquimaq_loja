import { supabase } from '@app/config/supabase';
import { countOpenStockBelowMinAlerts } from '@modules/inventory/services/inventoryApi';
import { countOpenTasks } from '@modules/dashboard/services/dashboardApi';

/** Sugestões que ainda exigem acompanhamento de compras. */
const PURCHASE_SUGGESTION_OPEN = ['sugerida', 'em_analise', 'em_cotacao', 'aguardando_aprovacao'] as const;

const RECEIPT_PENDING_STATUSES = ['aguardando_conferencia', 'em_conferencia'] as const;

const WO_OPEN_STATUSES = [
  'aberta',
  'em_diagnostico',
  'aguardando_orcamento',
  'aguardando_aprovacao',
  'aguardando_peca',
  'em_execucao',
] as const;

export type OperationalSnapshot = {
  alertsOpen: number;
  alertsCriticalApprox: number;
  tasksOpen: number;
  purchaseSuggestionsOpen: number;
  receiptsPendingCheck: number;
  workOrdersInProgress: number;
  stockBelowMinAlerts: number;
  weeklyActionsOpenSoon: number;
  improvementsActive: number;
};

/** Agrega contagens dos módulos operacionais para leitura gerencial rápida. */
export async function fetchOperationalSnapshot(): Promise<OperationalSnapshot> {
  const [
    alertsOpen,
    alertsCrit,
    tasksOpen,
    psOpen,
    rcv,
    wo,
    stockMin,
    weeklySoon,
    imp,
  ] = await Promise.all([
    supabase.from('alerts').select('id', { count: 'exact', head: true }).is('resolved_at', null),
    supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .or('priority.eq.critica,priority.eq.alta,impact.eq.critico,impact.eq.crítico'),
    countOpenTasks(),
    supabase
      .from('purchase_suggestions')
      .select('id', { count: 'exact', head: true })
      .in('status', [...PURCHASE_SUGGESTION_OPEN]),
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .in('status', [...RECEIPT_PENDING_STATUSES]),
    supabase.from('work_orders').select('id', { count: 'exact', head: true }).in('status', [...WO_OPEN_STATUSES]),
    countOpenStockBelowMinAlerts(),
    countWeeklyActionsDueSoon(),
    supabase
      .from('improvements')
      .select('id', { count: 'exact', head: true })
      .not('status', 'eq', 'closed'),
  ]);

  if (alertsOpen.error) throw new Error(alertsOpen.error.message);
  if (alertsCrit.error) throw new Error(alertsCrit.error.message);
  if (psOpen.error) throw new Error(psOpen.error.message);
  if (rcv.error) throw new Error(rcv.error.message);
  if (wo.error) throw new Error(wo.error.message);
  if (imp.error) throw new Error(imp.error.message);

  return {
    alertsOpen: alertsOpen.count ?? 0,
    alertsCriticalApprox: alertsCrit.count ?? 0,
    tasksOpen,
    purchaseSuggestionsOpen: psOpen.count ?? 0,
    receiptsPendingCheck: rcv.count ?? 0,
    workOrdersInProgress: wo.count ?? 0,
    stockBelowMinAlerts: stockMin,
    weeklyActionsOpenSoon: weeklySoon,
    improvementsActive: imp.count ?? 0,
  };
}

async function countWeeklyActionsDueSoon(): Promise<number> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const { count, error } = await supabase
    .from('weekly_actions')
    .select('id', { count: 'exact', head: true })
    .is('completed_at', null)
    .lte('due_date', horizon.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}
