import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type AlertRow = Database['public']['Tables']['alerts']['Row'];
export type WeeklyActionRow = Database['public']['Tables']['weekly_actions']['Row'];

export type AlertListItem = AlertRow & {
  responsible?: { id: string; full_name: string } | null;
};

export type WeeklyActionListItem = WeeklyActionRow & {
  responsible?: { id: string; full_name: string } | null;
};

/** % padrão novo (RPC) + denominador/numerador para leitura executiva em ~30s. */
export type NewStandardSnapshot = {
  pct: number;
  activeTotal: number;
  newStandardCount: number;
};

const PRIO_ORDER: Record<string, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

function isCriticalAlert(a: AlertRow): boolean {
  const p = (a.priority ?? '').toLowerCase();
  const imp = (a.impact ?? '').toLowerCase();
  if (p === 'critica' || p === 'alta') return true;
  if (imp === 'critico' || imp === 'crítico') return true;
  return false;
}

function sortAlertsCriticalFirst(rows: AlertListItem[]): AlertListItem[] {
  return [...rows].sort((a, b) => {
    const ca = isCriticalAlert(a) ? 0 : 1;
    const cb = isCriticalAlert(b) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    const pa = PRIO_ORDER[(a.priority ?? '').toLowerCase()] ?? 9;
    const pb = PRIO_ORDER[(b.priority ?? '').toLowerCase()] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return da - db;
  });
}

export async function fetchNewStandardSnapshot(): Promise<NewStandardSnapshot> {
  const rpc = await supabase.rpc('dashboard_new_standard_pct');
  if (rpc.error) throw new Error(rpc.error.message);
  const raw = rpc.data as unknown;
  const pct = typeof raw === 'number' ? raw : Number(raw ?? 0);

  const [active, ns] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_new_standard', true)
      .is('deleted_at', null),
  ]);
  if (active.error) throw new Error(active.error.message);
  if (ns.error) throw new Error(ns.error.message);
  return {
    pct,
    activeTotal: active.count ?? 0,
    newStandardCount: ns.count ?? 0,
  };
}

/** Alertas abertos; prioriza críticos/altos para o painel executivo. */
export async function listCriticalAlerts(limit = 12): Promise<AlertListItem[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select(
      `
      *,
      responsible:profiles!alerts_responsible_user_id_fkey ( id, full_name )
    `,
    )
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AlertListItem[];
  const sorted = sortAlertsCriticalFirst(rows);
  const criticalFirst = sorted.filter((r) => isCriticalAlert(r)).slice(0, limit);
  if (criticalFirst.length >= limit) return criticalFirst;
  const rest = sorted.filter((r) => !isCriticalAlert(r));
  return [...criticalFirst, ...rest].slice(0, limit);
}

/** Ações da semana: em aberto e com prazo nos próximos 14 dias (rotina semanal). */
export async function listWeeklyActionsDueSoon(limit = 15): Promise<WeeklyActionListItem[]> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const { data, error } = await supabase
    .from('weekly_actions')
    .select(
      `
      *,
      responsible:profiles!weekly_actions_responsible_user_id_fkey ( id, full_name )
    `,
    )
    .is('completed_at', null)
    .lte('due_date', horizon.toISOString())
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as WeeklyActionListItem[];
}

const OPEN_TASK_STATUSES = ['aberta', 'em_andamento', 'aguardando_terceiro', 'atrasada'] as const;

export async function countOpenTasks(): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', [...OPEN_TASK_STATUSES]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
