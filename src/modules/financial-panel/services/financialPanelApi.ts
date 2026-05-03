import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type FinancialBatchRow = Database['public']['Tables']['financial_import_batches']['Row'];
export type FinancialBatchInsert = Database['public']['Tables']['financial_import_batches']['Insert'];

export type ReceivableRow = Database['public']['Tables']['financial_receivables']['Row'];
export type ReceivableInsert = Database['public']['Tables']['financial_receivables']['Insert'];
export type PayableRow = Database['public']['Tables']['financial_payables']['Row'];
export type PayableInsert = Database['public']['Tables']['financial_payables']['Insert'];
export type CashProjectionRow = Database['public']['Tables']['financial_cash_projections']['Row'];
export type CashProjectionInsert = Database['public']['Tables']['financial_cash_projections']['Insert'];
export type DreRow = Database['public']['Tables']['financial_dre_contabil']['Row'];
export type DreInsert = Database['public']['Tables']['financial_dre_contabil']['Insert'];
export type TaxRow = Database['public']['Tables']['financial_tax_entries']['Row'];
export type TaxInsert = Database['public']['Tables']['financial_tax_entries']['Insert'];
export type NoteRow = Database['public']['Tables']['financial_accounting_notes']['Row'];
export type NoteInsert = Database['public']['Tables']['financial_accounting_notes']['Insert'];

export type DelinquencySummary = {
  total_open: number;
  overdue_open: number;
  overdue_lines: number;
  lines_open: number;
};

export async function fetchArDelinquency(): Promise<DelinquencySummary | null> {
  const { data, error } = await supabase.rpc('financial_ar_delinquency_summary');
  if (error) throw new Error(error.message);
  const row = (data as DelinquencySummary[] | null)?.[0];
  return row ?? null;
}

export async function fetchApDelinquency(): Promise<DelinquencySummary | null> {
  const { data, error } = await supabase.rpc('financial_ap_delinquency_summary');
  if (error) throw new Error(error.message);
  const row = (data as DelinquencySummary[] | null)?.[0];
  return row ?? null;
}

export async function createImportBatch(row: FinancialBatchInsert): Promise<FinancialBatchRow> {
  const { data, error } = await supabase.from('financial_import_batches').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as FinancialBatchRow;
}

export async function listReceivables(limit = 400): Promise<ReceivableRow[]> {
  const { data, error } = await supabase
    .from('financial_receivables')
    .select('*')
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReceivableRow[];
}

export async function listPayables(limit = 400): Promise<PayableRow[]> {
  const { data, error } = await supabase
    .from('financial_payables')
    .select('*')
    .order('due_date', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PayableRow[];
}

export async function listCashProjections(limit = 500): Promise<CashProjectionRow[]> {
  const { data, error } = await supabase
    .from('financial_cash_projections')
    .select('*')
    .order('projection_date', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CashProjectionRow[];
}

export async function listDre(limit = 800): Promise<DreRow[]> {
  const { data, error } = await supabase
    .from('financial_dre_contabil')
    .select('*')
    .order('period_month', { ascending: false })
    .order('account_code', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as DreRow[];
}

export async function listTaxes(limit = 400): Promise<TaxRow[]> {
  const { data, error } = await supabase
    .from('financial_tax_entries')
    .select('*')
    .order('period_month', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as TaxRow[];
}

export async function listNotes(limit = 200): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from('financial_accounting_notes')
    .select('*')
    .order('period_month', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as NoteRow[];
}

export async function upsertReceivables(rows: ReceivableInsert[]): Promise<void> {
  const n = 100;
  for (let i = 0; i < rows.length; i += n) {
    const slice = rows.slice(i, i + n);
    const { error } = await supabase.from('financial_receivables').upsert(slice, {
      onConflict: 'document_number,customer_name,due_date',
    });
    if (error) throw new Error(error.message);
  }
}

export async function upsertPayables(rows: PayableInsert[]): Promise<void> {
  const n = 100;
  for (let i = 0; i < rows.length; i += n) {
    const slice = rows.slice(i, i + n);
    const { error } = await supabase.from('financial_payables').upsert(slice, {
      onConflict: 'document_number,supplier_name,due_date',
    });
    if (error) throw new Error(error.message);
  }
}

export async function insertCashProjections(rows: CashProjectionInsert[]): Promise<void> {
  const n = 150;
  for (let i = 0; i < rows.length; i += n) {
    const { error } = await supabase.from('financial_cash_projections').insert(rows.slice(i, i + n));
    if (error) throw new Error(error.message);
  }
}

export async function upsertDre(rows: DreInsert[]): Promise<void> {
  const n = 100;
  for (let i = 0; i < rows.length; i += n) {
    const slice = rows.slice(i, i + n);
    const { error } = await supabase.from('financial_dre_contabil').upsert(slice, {
      onConflict: 'period_month,account_code,section',
    });
    if (error) throw new Error(error.message);
  }
}

export async function upsertTaxes(rows: TaxInsert[]): Promise<void> {
  const n = 100;
  for (let i = 0; i < rows.length; i += n) {
    const slice = rows.slice(i, i + n);
    const { error } = await supabase.from('financial_tax_entries').upsert(slice, {
      onConflict: 'period_month,tax_code',
    });
    if (error) throw new Error(error.message);
  }
}

export async function insertNotes(rows: NoteInsert[]): Promise<void> {
  const n = 150;
  for (let i = 0; i < rows.length; i += n) {
    const { error } = await supabase.from('financial_accounting_notes').insert(rows.slice(i, i + n));
    if (error) throw new Error(error.message);
  }
}
