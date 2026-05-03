import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductListRow = ProductRow & {
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primary_supplier: { id: string; name: string } | null;
  unit_purchase: { id: string; code: string; name: string } | null;
  unit_sale: { id: string; code: string; name: string } | null;
  result_center: { id: string; name: string } | null;
  responsible: { id: string; full_name: string } | null;
};

const productSelect = `
  *,
  category:product_categories(id,name),
  brand:brands(id,name),
  primary_supplier:suppliers(id,name),
  unit_purchase:units!products_unit_purchase_id_fkey(id,code,name),
  unit_sale:units!products_unit_sale_id_fkey(id,code,name),
  result_center:result_centers(id,name),
  responsible:profiles(id,full_name)
`;

export async function listProducts(): Promise<ProductListRow[]> {
  const { data, error } = await supabase.from('products').select(productSelect).order('description', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductListRow[];
}

export async function getProduct(id: string): Promise<ProductListRow | null> {
  const { data, error } = await supabase.from('products').select(productSelect).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProductListRow | null;
}

/** Campos calculados no trigger — não enviar no insert/update. */
export function stripComputedForWrite<T extends Record<string, unknown>>(row: T): Omit<
  T,
  'registration_score' | 'pendencies' | 'registration_status' | 'created_at' | 'updated_at'
> {
  const {
    registration_score: _rs,
    pendencies: _p,
    registration_status: _rst,
    created_at: _c,
    updated_at: _u,
    ...rest
  } = row as Record<string, unknown>;
  return rest as Omit<T, never>;
}

export async function insertProduct(row: ProductInsert): Promise<ProductRow> {
  const payload = stripComputedForWrite(row as Record<string, unknown>) as ProductInsert;
  const { data, error } = await supabase.from('products').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data as ProductRow;
}

export async function updateProduct(id: string, patch: ProductUpdate): Promise<ProductRow> {
  const payload = stripComputedForWrite(patch as Record<string, unknown>) as ProductUpdate;
  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as ProductRow;
}

export async function listProductCostHistory(productId: string) {
  const { data, error } = await supabase
    .from('product_cost_history')
    .select('id, previous_cost, new_cost, created_at, changed_by')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProductPriceHistory(productId: string) {
  const { data, error } = await supabase
    .from('product_price_history')
    .select(
      'id, previous_price, new_price, previous_margin_pct, new_margin_pct, previous_cost_snapshot, new_cost_snapshot, created_at, changed_by',
    )
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProductScoreHistory(productId: string) {
  const { data, error } = await supabase
    .from('product_score_history')
    .select('id, previous_score, new_score, pendencies_snapshot, created_at, changed_by')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAlternateSupplierIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_suppliers')
    .select('supplier_id')
    .eq('product_id', productId)
    .eq('is_alternate', true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.supplier_id);
}

export async function replaceAlternateSuppliers(productId: string, supplierIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('product_suppliers').delete().eq('product_id', productId);
  if (delErr) throw new Error(delErr.message);
  if (supplierIds.length === 0) return;
  const rows = supplierIds.map((supplier_id) => ({
    product_id: productId,
    supplier_id,
    is_alternate: true,
  }));
  const { error: insErr } = await supabase.from('product_suppliers').insert(rows);
  if (insErr) throw new Error(insErr.message);
}

type IdName = { id: string; name: string };
type UnitRow = { id: string; code: string; name: string };

export async function listCategories(): Promise<IdName[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as IdName[];
}

export async function listSubcategories(categoryId: string | null): Promise<{ id: string; name: string; category_id: string }[]> {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from('subcategories')
    .select('id, name, category_id')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; category_id: string }[];
}

export async function listBrands(): Promise<IdName[]> {
  const { data, error } = await supabase.from('brands').select('id, name').eq('is_active', true).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as IdName[];
}

export async function listSuppliers(): Promise<IdName[]> {
  const { data, error } = await supabase.from('suppliers').select('id, name').eq('is_active', true).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as IdName[];
}

export async function listUnits(): Promise<UnitRow[]> {
  const { data, error } = await supabase.from('units').select('id, code, name').eq('is_active', true).order('code');
  if (error) throw new Error(error.message);
  return (data ?? []) as UnitRow[];
}

export async function listResultCenters(): Promise<IdName[]> {
  const { data, error } = await supabase.from('result_centers').select('id, name').eq('is_active', true).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as IdName[];
}

export async function listProfilesForResponsible(): Promise<IdName[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; full_name: string }[]).map((p) => ({ id: p.id, name: p.full_name }));
}

export async function searchErpProducts(q: string, limit = 40): Promise<{ id: string; erp_code: string; description: string }[]> {
  const term = q.trim();
  const safe = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
  let query = supabase.from('erp_products').select('id, erp_code, description').eq('is_active', true).limit(limit);
  if (safe.length > 0 && safe !== '*') {
    query = query.or(`erp_code.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  const { data, error } = await query.order('description');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; erp_code: string; description: string }[];
}
