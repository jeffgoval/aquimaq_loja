import { supabase } from '@app/config/supabase';
import type { Database, Json } from '@shared/types/database';

export type ImportBatchRow = Database['public']['Tables']['management_sales_import_batches']['Row'];
export type ImportRowInsert = Database['public']['Tables']['management_sales_import_rows']['Insert'];

export type MarginBreakdownRow = {
  dimension_key: string;
  dimension_label: string;
  revenue: number;
  margin_value: number;
  qty: number;
  line_count: number;
};

export type DreLineRow = {
  sort_order: number;
  code: string;
  label: string;
  amount: number;
};

export async function createImportBatch(params: {
  sourceFilename: string | null;
  rowCount: number;
  createdBy: string;
}): Promise<ImportBatchRow> {
  const { data, error } = await supabase
    .from('management_sales_import_batches')
    .insert({
      source_filename: params.sourceFilename,
      row_count: params.rowCount,
      created_by: params.createdBy,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ImportBatchRow;
}

export async function insertImportRows(rows: ImportRowInsert[]): Promise<void> {
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from('management_sales_import_rows').insert(slice);
    if (error) throw new Error(error.message);
  }
}

export async function commitSalesImport(batchId: string): Promise<Json> {
  const { data, error } = await supabase.rpc('management_commit_sales_import', { p_batch_id: batchId });
  if (error) throw new Error(error.message);
  return data as Json;
}

export async function fetchMarginBreakdown(
  start: string,
  end: string,
  dimension: 'result_center' | 'product' | 'seller',
): Promise<MarginBreakdownRow[]> {
  const { data, error } = await supabase.rpc('management_margin_breakdown', {
    p_start: start,
    p_end: end,
    p_dimension: dimension,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as MarginBreakdownRow[];
}

export async function fetchDreBasic(
  start: string,
  end: string,
  resultCenterId: string | null,
): Promise<DreLineRow[]> {
  const { data, error } = await supabase.rpc('management_dre_basic', {
    p_start: start,
    p_end: end,
    p_result_center_id: resultCenterId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DreLineRow[];
}

export async function syncMarginAlerts(start: string, end: string): Promise<number> {
  const { data, error } = await supabase.rpc('management_sync_margin_alerts', {
    p_start: start,
    p_end: end,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

export type MarginAlertListRow = Database['public']['Tables']['alerts']['Row'];

export async function listManagementMarginAlerts(limit = 80): Promise<MarginAlertListRow[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('type', 'low_margin')
    .eq('origin', 'management_panel')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MarginAlertListRow[];
}
