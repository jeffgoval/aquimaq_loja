import { supabase } from '@app/config/supabase';
import type { Database, Json } from '@shared/types/database';
import { PRD_CATEGORY_NAMES, PRD_RESULT_CENTER_NAMES } from '../constants/prdSeeds';

export type StructureTableName =
  | 'result_centers'
  | 'cost_centers'
  | 'product_categories'
  | 'subcategories'
  | 'brands'
  | 'suppliers'
  | 'units';

export type StructureRow = Database['public']['Tables'][StructureTableName]['Row'];

export async function listStructureRows(
  table: StructureTableName,
  order: { column: string; ascending?: boolean } = { column: 'name', ascending: true },
): Promise<StructureRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(order.column, { ascending: order.ascending ?? true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StructureRow[];
}

export async function insertStructureRow(
  table: StructureTableName,
  row: Database['public']['Tables'][StructureTableName]['Insert'],
): Promise<StructureRow> {
  const { data, error } = await supabase.from(table).insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as StructureRow;
}

export async function updateStructureRow(
  table: StructureTableName,
  id: string,
  patch: Database['public']['Tables'][StructureTableName]['Update'],
): Promise<StructureRow> {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as StructureRow;
}

export async function deleteStructureRow(table: StructureTableName, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_row: Json | null;
  new_row: Json | null;
  changed_by: string | null;
  created_at: string;
}

export async function listAuditForEntity(
  entityType: StructureTableName,
  entityId: string,
): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, entity_type, entity_id, action, old_row, new_row, changed_by, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogRow[];
}

export type SeedPrdOutcome = { inserted: number };

export async function seedResultCentersFromPrd(): Promise<SeedPrdOutcome> {
  const { data: existing, error: e1 } = await supabase.from('result_centers').select('name');
  if (e1) throw new Error(e1.message);
  const have = new Set((existing ?? []).map((r) => r.name));
  const missing = PRD_RESULT_CENTER_NAMES.filter((n) => !have.has(n));
  if (missing.length === 0) return { inserted: 0 };
  const { data, error } = await supabase
    .from('result_centers')
    .insert(missing.map((name) => ({ name, is_active: true })))
    .select('id');
  if (error) throw new Error(error.message);
  return { inserted: data?.length ?? 0 };
}

export async function seedCategoriesFromPrd(): Promise<SeedPrdOutcome> {
  const { data: existing, error: e1 } = await supabase.from('product_categories').select('name');
  if (e1) throw new Error(e1.message);
  const have = new Set((existing ?? []).map((r) => r.name));
  const missing = PRD_CATEGORY_NAMES.filter((n) => !have.has(n));
  if (missing.length === 0) return { inserted: 0 };
  const { data, error } = await supabase
    .from('product_categories')
    .insert(missing.map((name) => ({ name, is_active: true })))
    .select('id');
  if (error) throw new Error(error.message);
  return { inserted: data?.length ?? 0 };
}
