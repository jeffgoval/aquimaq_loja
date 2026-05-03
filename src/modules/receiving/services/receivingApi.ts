import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
export type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
export type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];
export type ReceiptItemRow = Database['public']['Tables']['receipt_items']['Row'];
export type ReceiptItemInsert = Database['public']['Tables']['receipt_items']['Insert'];
export type ReceiptItemUpdate = Database['public']['Tables']['receipt_items']['Update'];

export type ReceiptListRow = ReceiptRow & {
  supplier: { id: string; name: string } | null;
  responsible: { id: string; full_name: string } | null;
};

export type ReceiptDetail = ReceiptRow & {
  supplier: { id: string; name: string } | null;
  responsible: { id: string; full_name: string } | null;
  receipt_items: ReceiptItemDetail[];
};

export type ReceiptItemDetail = ReceiptItemRow & {
  product: { id: string; internal_code: string; description: string; management_cost: number | null } | null;
  location: { id: string; code: string; name: string } | null;
};

export type ApprovedSuggestionOption = {
  id: string;
  label: string;
};

const receiptListSelect = `
  *,
  supplier:suppliers ( id, name ),
  responsible:profiles!receipts_responsible_user_id_fkey ( id, full_name )
`;

const receiptDetailSelect = `
  *,
  supplier:suppliers ( id, name ),
  responsible:profiles!receipts_responsible_user_id_fkey ( id, full_name ),
  receipt_items (
    *,
    product:products ( id, internal_code, description, management_cost ),
    location:stock_locations!receipt_items_stock_location_id_fkey ( id, code, name )
  )
`;

export async function listReceipts(limit = 120): Promise<ReceiptListRow[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select(receiptListSelect)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReceiptListRow[];
}

export async function getReceipt(id: string): Promise<ReceiptDetail | null> {
  const { data, error } = await supabase.from('receipts').select(receiptDetailSelect).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as ReceiptDetail & { receipt_items?: ReceiptItemDetail[] };
  return {
    ...row,
    receipt_items: row.receipt_items ?? [],
  };
}

export async function insertReceipt(row: ReceiptInsert): Promise<ReceiptRow> {
  const { data, error } = await supabase.from('receipts').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as ReceiptRow;
}

export async function updateReceipt(id: string, patch: ReceiptUpdate): Promise<ReceiptRow> {
  const { data, error } = await supabase.from('receipts').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as ReceiptRow;
}

export async function insertReceiptItem(row: ReceiptItemInsert): Promise<ReceiptItemRow> {
  const { data, error } = await supabase.from('receipt_items').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as ReceiptItemRow;
}

export async function updateReceiptItem(id: string, patch: ReceiptItemUpdate): Promise<ReceiptItemRow> {
  const { data, error } = await supabase.from('receipt_items').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as ReceiptItemRow;
}

export async function receiptReleaseForSale(receiptId: string): Promise<void> {
  const { error } = await supabase.rpc('receipt_release_for_sale', { p_receipt_id: receiptId });
  if (error) throw new Error(error.message);
}

export async function listApprovedSuggestionsForLink(): Promise<ApprovedSuggestionOption[]> {
  const { data, error } = await supabase
    .from('purchase_suggestions')
    .select(
      `
      id,
      product:products ( internal_code, description )
    `,
    )
    .eq('status', 'aprovada')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      product: { internal_code: string; description: string } | null;
    };
    const p = r.product;
    const label = p ? `${p.internal_code} — ${p.description}` : r.id;
    return { id: r.id, label };
  });
}
