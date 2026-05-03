import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export const WORKSHOP_PHOTOS_BUCKET = 'workshop-photos';

export type WorkOrderRow = Database['public']['Tables']['work_orders']['Row'];
export type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
export type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];
export type WorkOrderItemRow = Database['public']['Tables']['work_order_items']['Row'];
export type WorkOrderItemInsert = Database['public']['Tables']['work_order_items']['Insert'];
export type WorkOrderWarrantyInsert = Database['public']['Tables']['work_order_warranties']['Insert'];
export type WorkOrderPhotoRow = Database['public']['Tables']['work_order_photos']['Row'];
export type WorkOrderPhotoInsert = Database['public']['Tables']['work_order_photos']['Insert'];

export type WorkOrderListRow = WorkOrderRow & {
  technician: { id: string; full_name: string } | null;
  responsible: { id: string; full_name: string } | null;
};

export type WorkOrderDetail = WorkOrderRow & {
  technician: { id: string; full_name: string } | null;
  responsible: { id: string; full_name: string } | null;
  work_order_items: WorkOrderItemListRow[];
  work_order_photos: WorkOrderPhotoRow[];
};

export type WorkOrderItemListRow = WorkOrderItemRow & {
  product: { internal_code: string; description: string } | null;
};

export type StatusHistoryRow = Database['public']['Tables']['work_order_status_history']['Row'] & {
  changer: { full_name: string } | null;
};

const listSelect = `
  *,
  technician:profiles!work_orders_technician_id_fkey ( id, full_name ),
  responsible:profiles!work_orders_responsible_user_id_fkey ( id, full_name )
`;

export async function listWorkOrders(limit = 120): Promise<WorkOrderListRow[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select(listSelect)
    .order('opened_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkOrderListRow[];
}

export async function getWorkOrder(id: string): Promise<WorkOrderDetail | null> {
  const { data: wo, error: woErr } = await supabase
    .from('work_orders')
    .select(
      `
      *,
      technician:profiles!work_orders_technician_id_fkey ( id, full_name ),
      responsible:profiles!work_orders_responsible_user_id_fkey ( id, full_name ),
      work_order_items (
        *,
        product:products ( internal_code, description )
      ),
      work_order_photos ( id, work_order_id, storage_path, caption, created_at, created_by )
    `,
    )
    .eq('id', id)
    .maybeSingle();
  if (woErr) throw new Error(woErr.message);
  if (!wo) return null;
  const row = wo as WorkOrderDetail & {
    work_order_items?: WorkOrderItemListRow[];
    work_order_photos?: WorkOrderPhotoRow[];
  };
  return {
    ...row,
    work_order_items: row.work_order_items ?? [],
    work_order_photos: row.work_order_photos ?? [],
  };
}

export async function listWorkOrderStatusHistory(workOrderId: string): Promise<StatusHistoryRow[]> {
  const { data, error } = await supabase
    .from('work_order_status_history')
    .select(
      `
      *,
      changer:profiles!work_order_status_history_changed_by_fkey ( full_name )
    `,
    )
    .eq('work_order_id', workOrderId)
    .order('changed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StatusHistoryRow[];
}

export async function insertWorkOrder(row: WorkOrderInsert): Promise<WorkOrderRow> {
  const { data, error } = await supabase.from('work_orders').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as WorkOrderRow;
}

export async function updateWorkOrder(id: string, patch: WorkOrderUpdate): Promise<WorkOrderRow> {
  const { data, error } = await supabase.from('work_orders').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as WorkOrderRow;
}

export async function insertWorkOrderItem(row: WorkOrderItemInsert): Promise<WorkOrderItemRow> {
  const { data, error } = await supabase.from('work_order_items').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as WorkOrderItemRow;
}

export async function insertWorkOrderWarranty(row: WorkOrderWarrantyInsert): Promise<void> {
  const { error } = await supabase.from('work_order_warranties').insert(row);
  if (error) throw new Error(error.message);
}

export async function insertWorkOrderPhoto(row: WorkOrderPhotoInsert): Promise<WorkOrderPhotoRow> {
  const { data, error } = await supabase.from('work_order_photos').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as WorkOrderPhotoRow;
}

export async function deleteWorkOrderPhoto(id: string, storagePath: string): Promise<void> {
  const { error: stErr } = await supabase.storage.from(WORKSHOP_PHOTOS_BUCKET).remove([storagePath]);
  if (stErr) throw new Error(stErr.message);
  const { error } = await supabase.from('work_order_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function workshopConsumePartStock(itemId: string, justification: string): Promise<number> {
  const { data, error } = await supabase.rpc('workshop_consume_part_stock', {
    p_item_id: itemId,
    p_justification: justification,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

export async function workshopSyncStalledOsAlerts(days = 5): Promise<number> {
  const { data, error } = await supabase.rpc('workshop_sync_stalled_os_alerts', { p_days: days });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

export async function createSignedPhotoUrl(storagePath: string, expiresSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(WORKSHOP_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error('URL assinada indisponível');
  return data.signedUrl;
}
