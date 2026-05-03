import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type WeeklyRoutineTemplateRow = Database['public']['Tables']['weekly_routine_templates']['Row'];
export type WeeklyRoutineTemplateInsert = Database['public']['Tables']['weekly_routine_templates']['Insert'];
export type WeeklyRoutineTemplateUpdate = Database['public']['Tables']['weekly_routine_templates']['Update'];

export type WeeklyRoutineLogRow = Database['public']['Tables']['weekly_routine_logs']['Row'];
export type WeeklyRoutineLogInsert = Database['public']['Tables']['weekly_routine_logs']['Insert'];
export type WeeklyRoutineLogUpdate = Database['public']['Tables']['weekly_routine_logs']['Update'];

export type WeeklyRoutineLogListRow = WeeklyRoutineLogRow & {
  related_task: { id: string; title: string; status: string } | null;
};

/** Segunda-feira (ISO) da semana de `d`, formato `YYYY-MM-DD`. */
export function weekStartMondayFromDate(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
}

const WEEKDAY_PT: Record<number, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo',
};

export function weekdayLabel(n: number): string {
  return WEEKDAY_PT[n] ?? `Dia ${n}`;
}

export async function listWeeklyRoutineTemplates(): Promise<WeeklyRoutineTemplateRow[]> {
  const { data, error } = await supabase
    .from('weekly_routine_templates')
    .select('*')
    .order('weekday', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as WeeklyRoutineTemplateRow[];
}

export async function insertWeeklyRoutineTemplate(row: WeeklyRoutineTemplateInsert): Promise<WeeklyRoutineTemplateRow> {
  const { data, error } = await supabase.from('weekly_routine_templates').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as WeeklyRoutineTemplateRow;
}

export async function updateWeeklyRoutineTemplate(
  id: string,
  patch: WeeklyRoutineTemplateUpdate,
): Promise<WeeklyRoutineTemplateRow> {
  const { data, error } = await supabase.from('weekly_routine_templates').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as WeeklyRoutineTemplateRow;
}

export async function listWeeklyRoutineLogs(weekStartMonday: string): Promise<WeeklyRoutineLogListRow[]> {
  const { data, error } = await supabase
    .from('weekly_routine_logs')
    .select(
      `
      *,
      related_task:tasks!weekly_routine_logs_related_task_id_fkey ( id, title, status )
    `,
    )
    .eq('week_start_monday', weekStartMonday)
    .order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as WeeklyRoutineLogListRow[];
}

export async function updateWeeklyRoutineLog(id: string, patch: WeeklyRoutineLogUpdate): Promise<WeeklyRoutineLogRow> {
  const { data, error } = await supabase.from('weekly_routine_logs').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as WeeklyRoutineLogRow;
}

/** Cria linhas de registo a partir da pauta fixa, ignorando duplicados (template + semana). */
export async function seedWeeklyLogsFromTemplates(
  weekStartMonday: string,
  createdBy: string | null,
): Promise<number> {
  const { data: templates, error: te } = await supabase
    .from('weekly_routine_templates')
    .select('id, title')
    .eq('is_active', true);
  if (te) throw new Error(te.message);
  const tpls = templates ?? [];

  const { data: existing, error: ee } = await supabase
    .from('weekly_routine_logs')
    .select('template_id')
    .eq('week_start_monday', weekStartMonday);
  if (ee) throw new Error(ee.message);
  const have = new Set((existing ?? []).map((r) => r.template_id).filter(Boolean));

  let inserted = 0;
  for (const t of tpls) {
    if (have.has(t.id)) continue;
    const row: WeeklyRoutineLogInsert = {
      week_start_monday: weekStartMonday,
      template_id: t.id,
      title: t.title,
      created_by: createdBy,
    };
    const { error: ie } = await supabase.from('weekly_routine_logs').insert(row);
    if (ie) throw new Error(ie.message);
    inserted += 1;
  }
  return inserted;
}
