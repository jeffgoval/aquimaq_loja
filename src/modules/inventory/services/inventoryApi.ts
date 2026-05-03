import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type StockLocationRow = Database['public']['Tables']['stock_locations']['Row'];
export type StockLocationInsert = Database['public']['Tables']['stock_locations']['Insert'];
export type StockLocationUpdate = Database['public']['Tables']['stock_locations']['Update'];
export type StockTypeRow = Database['public']['Tables']['stock_types']['Row'];

export type StockBalanceRow = {
  product_id: string;
  stock_type_id: string;
  stock_location_id: string;
  quantity: number;
  updated_at: string;
  products: {
    id: string;
    description: string;
    internal_code: string;
    min_stock: number | null;
    deleted_at: string | null;
  } | null;
  stock_types: { id: string; code: string; name: string } | null;
  stock_locations: { id: string; code: string; name: string } | null;
};

export type ProductOption = { id: string; internal_code: string; description: string };

/** Linha de auditoria de movimentos (ajuste com justificativa). */
export type StockMovementListRow = {
  id: string;
  delta_qty: number;
  balance_after: number;
  movement_kind: string;
  justification: string;
  created_at: string;
  products: { description: string; internal_code: string; deleted_at: string | null } | null;
  stock_types: { code: string } | null;
  stock_locations: { code: string } | null;
  creator: { full_name: string } | null;
};

export async function listStockTypes(): Promise<StockTypeRow[]> {
  const { data, error } = await supabase
    .from('stock_types')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as StockTypeRow[];
}

export async function listStockLocations(): Promise<StockLocationRow[]> {
  const { data, error } = await supabase.from('stock_locations').select('*').is('deleted_at', null).order('code');
  if (error) throw new Error(error.message);
  return (data ?? []) as StockLocationRow[];
}

export async function insertStockLocation(row: StockLocationInsert): Promise<StockLocationRow> {
  const { data, error } = await supabase.from('stock_locations').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as StockLocationRow;
}

export async function updateStockLocation(id: string, patch: StockLocationUpdate): Promise<StockLocationRow> {
  const { data, error } = await supabase.from('stock_locations').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as StockLocationRow;
}

export async function listStockBalances(): Promise<StockBalanceRow[]> {
  const { data, error } = await supabase
    .from('product_stock_balances')
    .select(
      `
      product_id,
      stock_type_id,
      stock_location_id,
      quantity,
      updated_at,
      products ( id, description, internal_code, min_stock, deleted_at ),
      stock_types ( id, code, name ),
      stock_locations ( id, code, name )
    `,
    )
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as StockBalanceRow[];
  return rows.filter((r) => r.products && r.products.deleted_at == null);
}

export async function listProductsForStock(): Promise<ProductOption[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, internal_code, description')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('description', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductOption[];
}

export async function countOpenStockBelowMinAlerts(): Promise<number> {
  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'estoque_abaixo_minimo')
    .is('resolved_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listStockMovements(limit = 40): Promise<StockMovementListRow[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select(
      `
      id,
      delta_qty,
      balance_after,
      movement_kind,
      justification,
      created_at,
      products ( description, internal_code, deleted_at ),
      stock_types ( code ),
      stock_locations ( code ),
      creator:profiles!stock_movements_created_by_fkey ( full_name )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const movements = (data ?? []) as StockMovementListRow[];
  return movements.filter((r) => r.products && r.products.deleted_at == null);
}

export async function applyStockMovement(args: {
  productId: string;
  stockTypeId: string;
  stockLocationId: string;
  delta: number;
  justification: string;
  kind?: 'initial' | 'adjustment' | 'transfer';
}): Promise<number> {
  const { data, error } = await supabase.rpc('stock_apply_movement', {
    p_product_id: args.productId,
    p_stock_type_id: args.stockTypeId,
    p_stock_location_id: args.stockLocationId,
    p_delta: args.delta,
    p_justification: args.justification,
    p_kind: args.kind ?? 'adjustment',
  });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}
