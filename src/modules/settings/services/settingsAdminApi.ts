import { supabase } from '@app/config/supabase';
import type { Database } from '@shared/types/database';

export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type PermissionCatalogRow = Database['public']['Tables']['crm_permission_catalog']['Row'];
export type RolePermissionRow = Database['public']['Tables']['crm_role_permissions']['Row'];
export type FeatureCatalogRow = Database['public']['Tables']['crm_feature_catalog']['Row'];
export type FeatureRoleFlagRow = Database['public']['Tables']['crm_feature_role_flags']['Row'];
export type UserPermissionOverrideRow = Database['public']['Tables']['user_permission_overrides']['Row'];

export type ProfileBrief = { id: string; full_name: string; role: string };

export async function listAuditLogs(filters: {
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AuditLogRow[]> {
  const limit = Math.min(filters.limit ?? 500, 2000);
  let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  const et = filters.entityType?.trim();
  if (et) q = q.ilike('entity_type', `%${et}%`);
  const ac = filters.action?.trim();
  if (ac) q = q.ilike('action', `%${ac}%`);
  if (filters.from?.trim()) q = q.gte('created_at', `${filters.from.trim()}T00:00:00.000Z`);
  if (filters.to?.trim()) q = q.lte('created_at', `${filters.to.trim()}T23:59:59.999Z`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogRow[];
}

export async function listPermissionCatalog(): Promise<PermissionCatalogRow[]> {
  const { data, error } = await supabase.from('crm_permission_catalog').select('*').order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as PermissionCatalogRow[];
}

export async function listRolePermissionsMatrix(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.from('crm_role_permissions').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as RolePermissionRow[];
}

export async function upsertRolePermission(row: {
  role: string;
  permission_key: string;
  allowed: boolean;
}): Promise<void> {
  const { error } = await supabase.from('crm_role_permissions').upsert(
    {
      role: row.role,
      permission_key: row.permission_key,
      allowed: row.allowed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'role,permission_key' },
  );
  if (error) throw new Error(error.message);
}

export async function listFeatureCatalog(): Promise<FeatureCatalogRow[]> {
  const { data, error } = await supabase.from('crm_feature_catalog').select('*').order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as FeatureCatalogRow[];
}

export async function listFeatureRoleMatrix(): Promise<FeatureRoleFlagRow[]> {
  const { data, error } = await supabase.from('crm_feature_role_flags').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as FeatureRoleFlagRow[];
}

export async function upsertFeatureRoleFlag(row: {
  flag_key: string;
  role: string;
  enabled: boolean;
}): Promise<void> {
  const { error } = await supabase.from('crm_feature_role_flags').upsert(
    {
      flag_key: row.flag_key,
      role: row.role,
      enabled: row.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'flag_key,role' },
  );
  if (error) throw new Error(error.message);
}

export async function listProfilesBrief(): Promise<ProfileBrief[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileBrief[];
}

export async function listUserPermissionOverrides(): Promise<UserPermissionOverrideRow[]> {
  const { data, error } = await supabase.from('user_permission_overrides').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserPermissionOverrideRow[];
}

export async function upsertUserPermissionOverride(row: {
  user_id: string;
  permission_key: string;
  allowed: boolean;
}): Promise<void> {
  const { error } = await supabase.from('user_permission_overrides').upsert(
    {
      user_id: row.user_id,
      permission_key: row.permission_key,
      allowed: row.allowed,
    },
    { onConflict: 'user_id,permission_key' },
  );
  if (error) throw new Error(error.message);
}

export async function deleteUserPermissionOverride(id: string): Promise<void> {
  const { error } = await supabase.from('user_permission_overrides').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Flags efectivos para o role corrente (uma linha por flag_key). */
export async function listFeatureFlagsForMyRole(role: string): Promise<FeatureRoleFlagRow[]> {
  const { data, error } = await supabase.from('crm_feature_role_flags').select('*').eq('role', role);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeatureRoleFlagRow[];
}

export async function listRolePermissionsForRole(role: string): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.from('crm_role_permissions').select('*').eq('role', role);
  if (error) throw new Error(error.message);
  return (data ?? []) as RolePermissionRow[];
}

export async function listMyPermissionOverrides(userId: string): Promise<UserPermissionOverrideRow[]> {
  const { data, error } = await supabase.from('user_permission_overrides').select('*').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as UserPermissionOverrideRow[];
}
