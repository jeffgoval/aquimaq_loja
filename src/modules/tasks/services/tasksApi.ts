import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskListRow = TaskRow & {
  responsible: { id: string; full_name: string } | null;
};

export async function listTasks(): Promise<TaskListRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      responsible:profiles!tasks_responsible_user_id_fkey ( id, full_name )
    `,
    )
    .order('due_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TaskListRow[];
}

export async function insertTask(row: TaskInsert): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as TaskRow;
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as TaskRow;
}

export async function completeTask(id: string): Promise<TaskRow> {
  return updateTask(id, {
    status: 'concluida',
    completed_at: new Date().toISOString(),
  });
}

/** RLS: apenas admin ou gestor (ver política `tasks_delete`). */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
