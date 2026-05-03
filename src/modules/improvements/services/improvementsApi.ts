import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type ImprovementRow = Database['public']['Tables']['improvements']['Row'];
export type ImprovementInsert = Database['public']['Tables']['improvements']['Insert'];
export type ImprovementUpdate = Database['public']['Tables']['improvements']['Update'];

export const IMPROVEMENT_STATUSES = [
  'brainstorm',
  'plan',
  'do',
  'check',
  'act',
  'closed',
] as const;

export type ImprovementListRow = ImprovementRow & {
  owner: { id: string; full_name: string } | null;
};

export async function listImprovements(): Promise<ImprovementListRow[]> {
  const { data, error } = await supabase
    .from('improvements')
    .select(
      `
      *,
      owner:profiles!improvements_owner_id_fkey ( id, full_name )
    `,
    )
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ImprovementListRow[];
}

export async function insertImprovement(row: ImprovementInsert): Promise<ImprovementRow> {
  const { data, error } = await supabase.from('improvements').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as ImprovementRow;
}

export async function updateImprovement(id: string, patch: ImprovementUpdate): Promise<ImprovementRow> {
  const { data, error } = await supabase.from('improvements').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as ImprovementRow;
}

export async function deleteImprovement(id: string): Promise<void> {
  const { error } = await supabase.from('improvements').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
