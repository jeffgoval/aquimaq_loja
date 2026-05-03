import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { useCrmAccess } from '@modules/settings/hooks/useCrmAccess';
import { getNavItemForRoute, navItemRoleAllowed } from '@app/layouts/navigation';

/**
 * Garante que a rota actual respeita a mesma matriz de permissões, feature flags e perfis definidos para o menu.
 * Se os dados de permissão falharem a carregar, o acesso não é bloqueado (modo degradado).
 */
export function CrmRouteGuard({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const user = useCurrentUser();
  const { isNavItemVisible, isLoading, crmAccessDegraded } = useCrmAccess();
  const item = getNavItemForRoute(location.pathname);

  if (!user) return null;

  if (item) {
    if (!navItemRoleAllowed(item, user.role)) {
      return <Navigate to="/" replace />;
    }
    const needsCrm = Boolean(item.permissionKey || item.featureFlagKey);
    if (needsCrm && !crmAccessDegraded && isLoading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          A verificar permissões…
        </div>
      );
    }
    if (!crmAccessDegraded && !isNavItemVisible(item)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children ?? <Outlet />}</>;
}
