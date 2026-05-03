import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type PurchaseSuggestionRow = Database['public']['Tables']['purchase_suggestions']['Row'];
export type PurchaseQuoteRow = Database['public']['Tables']['purchase_quotes']['Row'];
export type PurchaseQuoteInsert = Database['public']['Tables']['purchase_quotes']['Insert'];
export type PurchaseQuoteUpdate = Database['public']['Tables']['purchase_quotes']['Update'];
export type PurchaseSuggestionInsert = Database['public']['Tables']['purchase_suggestions']['Insert'];
export type PurchaseSuggestionUpdate = Database['public']['Tables']['purchase_suggestions']['Update'];

export type PurchaseSuggestionListRow = PurchaseSuggestionRow & {
  product: { id: string; internal_code: string; description: string; min_stock: number | null } | null;
  responsible: { id: string; full_name: string } | null;
  approver: { id: string; full_name: string } | null;
};

export type PurchaseQuoteListRow = PurchaseQuoteRow & {
  supplier: { id: string; name: string } | null;
};

export type QuotedCostHistoryRow = Database['public']['Tables']['product_quoted_cost_history']['Row'] & {
  product: { internal_code: string; description: string } | null;
  supplier: { name: string } | null;
  recorder: { full_name: string } | null;
};

const suggestionSelect = `
  *,
  product:products ( id, internal_code, description, min_stock ),
  responsible:profiles!purchase_suggestions_responsible_user_id_fkey ( id, full_name ),
  approver:profiles!purchase_suggestions_approved_by_fkey ( id, full_name )
`;

const quoteSelect = `
  *,
  supplier:suppliers ( id, name )
`;

export async function listPurchaseSuggestions(limit = 200): Promise<PurchaseSuggestionListRow[]> {
  const { data, error } = await supabase
    .from('purchase_suggestions')
    .select(suggestionSelect)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PurchaseSuggestionListRow[];
}

export async function countPurchaseSuggestionsByStatus(status: string): Promise<number> {
  const { count, error } = await supabase
    .from('purchase_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listQuotesForSuggestion(suggestionId: string): Promise<PurchaseQuoteListRow[]> {
  const { data, error } = await supabase
    .from('purchase_quotes')
    .select(quoteSelect)
    .eq('suggestion_id', suggestionId)
    .order('unit_price', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PurchaseQuoteListRow[];
}

export async function listQuotedCostHistory(limit = 80): Promise<QuotedCostHistoryRow[]> {
  const { data, error } = await supabase
    .from('product_quoted_cost_history')
    .select(
      `
      *,
      product:products ( internal_code, description ),
      supplier:suppliers ( name ),
      recorder:profiles!product_quoted_cost_history_recorded_by_fkey ( full_name )
    `,
    )
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as QuotedCostHistoryRow[];
}

export async function getGerencialVendaQtyForProduct(productId: string): Promise<number> {
  const { data: st, error: stErr } = await supabase.from('stock_types').select('id').eq('code', 'VENDA').maybeSingle();
  if (stErr) throw new Error(stErr.message);
  if (!st?.id) return 0;
  const { data, error } = await supabase
    .from('product_stock_balances')
    .select('quantity')
    .eq('product_id', productId)
    .eq('stock_type_id', st.id);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((acc, row) => acc + Number(row.quantity ?? 0), 0);
}

export async function getProductMinStock(productId: string): Promise<number | null> {
  const { data, error } = await supabase.from('products').select('min_stock').eq('id', productId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.min_stock ?? null;
}

export async function purchaseSyncSuggestionsFromMinStock(): Promise<number> {
  const { data, error } = await supabase.rpc('purchase_sync_suggestions_from_min_stock');
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

export async function purchaseSuggestionRequestApproval(suggestionId: string): Promise<void> {
  const { error } = await supabase.rpc('purchase_suggestion_request_approval', {
    p_suggestion_id: suggestionId,
  });
  if (error) throw new Error(error.message);
}

export async function purchaseSuggestionApprove(suggestionId: string, quoteId: string): Promise<void> {
  const { error } = await supabase.rpc('purchase_suggestion_approve', {
    p_suggestion_id: suggestionId,
    p_quote_id: quoteId,
  });
  if (error) throw new Error(error.message);
}

export async function insertPurchaseQuote(row: PurchaseQuoteInsert): Promise<PurchaseQuoteRow> {
  const { data, error } = await supabase.from('purchase_quotes').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as PurchaseQuoteRow;
}

export async function updatePurchaseQuote(id: string, patch: PurchaseQuoteUpdate): Promise<PurchaseQuoteRow> {
  const { data, error } = await supabase.from('purchase_quotes').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as PurchaseQuoteRow;
}

export async function insertManualPurchaseSuggestion(args: {
  product_id: string;
  quantity_suggested: number;
  responsible_user_id: string;
  notes?: string | null;
  priority?: string;
}): Promise<PurchaseSuggestionRow> {
  const gerencial = await getGerencialVendaQtyForProduct(args.product_id);
  const minStock = await getProductMinStock(args.product_id);
  const payload: PurchaseSuggestionInsert = {
    product_id: args.product_id,
    quantity_suggested: args.quantity_suggested,
    responsible_user_id: args.responsible_user_id,
    notes: args.notes ?? null,
    origin: 'manual',
    status: 'em_analise',
    gerencial_qty_snapshot: gerencial,
    min_stock_snapshot: minStock,
    priority: args.priority ?? 'media',
  };
  const { data, error } = await supabase.from('purchase_suggestions').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data as PurchaseSuggestionRow;
}

export async function updatePurchaseSuggestion(id: string, patch: PurchaseSuggestionUpdate): Promise<PurchaseSuggestionRow> {
  const { data, error } = await supabase.from('purchase_suggestions').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as PurchaseSuggestionRow;
}
