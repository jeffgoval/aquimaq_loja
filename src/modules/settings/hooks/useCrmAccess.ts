import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import {
  listFeatureFlagsForMyRole,
  listMyPermissionOverrides,
  listRolePermissionsForRole,
} from '../services/settingsAdminApi';
import type { NavItem } from '@app/layouts/navigation';

function flagDefaultEnabled(flagKey: string, rows: { flag_key: string; enabled: boolean }[]): boolean {
  const hit = rows.find((r) => r.flag_key === flagKey);
  if (hit === undefined) return true;
  return hit.enabled;
}

function permissionDefaultAllowed(
  permissionKey: string,
  matrix: { permission_key: string; allowed: boolean }[],
  overrides: { permission_key: string; allowed: boolean }[],
): boolean {
  const o = overrides.find((x) => x.permission_key === permissionKey);
  if (o) return o.allowed;
  const m = matrix.find((x) => x.permission_key === permissionKey);
  if (m !== undefined) return m.allowed;
  return true;
}

/**
 * Leitura da matriz CRM (Fase 12) para filtrar navegação e funcionalidades por role, override e feature flag.
 */
export function useCrmAccess() {
  const user = useCurrentUser();
  const role = user?.role;

  const matrixQ = useQuery({
    queryKey: ['crm-role-permissions', role],
    queryFn: () => listRolePermissionsForRole(role!),
    enabled: Boolean(role),
    staleTime: 60_000,
  });

  const overridesQ = useQuery({
    queryKey: ['crm-user-overrides', user?.id],
    queryFn: () => listMyPermissionOverrides(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const flagsQ = useQuery({
    queryKey: ['crm-feature-flags', role],
    queryFn: () => listFeatureFlagsForMyRole(role!),
    enabled: Boolean(role),
    staleTime: 60_000,
  });

  const isNavItemVisible = useCallback(
    (item: NavItem): boolean => {
      if (!item.permissionKey && !item.featureFlagKey) return true;
      const matrix = matrixQ.data ?? [];
      const ovs = overridesQ.data ?? [];
      const flags = flagsQ.data ?? [];
      if (item.permissionKey && !permissionDefaultAllowed(item.permissionKey, matrix, ovs)) return false;
      if (item.featureFlagKey && !flagDefaultEnabled(item.featureFlagKey, flags)) return false;
      return true;
    },
    [matrixQ.data, overridesQ.data, flagsQ.data],
  );

  const canExportAuditCsv = useMemo(
    () => flagDefaultEnabled('feat.export_audit_csv', flagsQ.data ?? []),
    [flagsQ.data],
  );

  const crmAccessDegraded = matrixQ.isError || overridesQ.isError || flagsQ.isError;

  return {
    isNavItemVisible,
    canExportAuditCsv,
    crmAccessDegraded,
    isLoading: matrixQ.isLoading || overridesQ.isLoading || flagsQ.isLoading,
  };
}
